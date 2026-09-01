import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import { config } from './src/config.ts';

const ROOT = import.meta.dirname;
const BUILD_ENTRY = resolve(ROOT, 'src/build.ts');

/** Source trees whose contents feed the generated site. */
const SOURCES = ['src', 'docs'].map((dir) => resolve(ROOT, dir));

const run = promisify(execFile);

/**
 * The rebuild currently in flight, or null when idle.
 *
 * Requests wait on this: the builder empties dist/ before it refills it, so a
 * request that lands in that window gets a 404 for a page that exists. The
 * browser hits exactly that after an edit, which is why this is shared between
 * the two plugins below.
 */
let rebuilding: Promise<void> | null = null;

/**
 * Runs the static-site build whenever `src/` or `docs/` changes, then tells the
 * browser to reload. Vite itself only ever serves the generated `dist/`.
 *
 * The build runs as a child process rather than an in-process import. Importing
 * it would cache the module graph, so an edit to anything `build.ts` imports
 * would be silently ignored and the server would serve a stale site — a
 * cache-busting query on the entry does NOT invalidate its transitive imports.
 * Spawning costs ~50ms and is exactly what `npm run build` does.
 */
function buildSite(): Plugin {
	let dirty = false;

	function rebuild(server: ViteDevServer): Promise<void> {
		// Coalesce edits that land mid-build instead of running them in parallel.
		if (rebuilding) {
			dirty = true;
			return rebuilding;
		}

		const pending = (async () => {
			do {
				dirty = false;
				try {
					await run(process.execPath, [BUILD_ENTRY], { cwd: ROOT });
					server.config.logger.info('[cms] rebuilt');
					server.hot.send({ type: 'full-reload' });
				} catch (error) {
					// Keep serving the last good build rather than dying on a broken edit.
					server.config.logger.error(`[cms] build failed: ${error}`);
				}
			} while (dirty);
		})();

		rebuilding = pending;
		void pending.finally(() => {
			if (rebuilding === pending) rebuilding = null;
		});
		return pending;
	}

	return {
		name: 'versatiles-cms',
		configureServer(server) {
			server.watcher.add(SOURCES);
			const onChange = (file: string) => {
				if (SOURCES.some((dir) => file.startsWith(dir))) void rebuild(server);
			};
			server.watcher.on('change', onChange);
			server.watcher.on('add', onChange);
			server.watcher.on('unlink', onChange);
			// Post hook: build once the middlewares are in place.
			return () => void rebuild(server);
		},
	};
}

/**
 * Serves `/foo/` from `dist/foo.html`, the way GitHub Pages does.
 *
 * Vite serves dist/ as a multi-page app, so `/foo/` looks for
 * `dist/foo/index.html` and 404s. Pages instead serves `foo.html` there, and
 * that trailing-slash form is what `canonicalUrl` and the menu link to — so
 * without this rewrite every page built from a top-level `.md`/`.html` is
 * unreachable locally under its own production URL.
 */
function pagesUrls(): Plugin {
	const distRoot = resolve(ROOT, config.distDir);

	return {
		name: 'versatiles-pages-urls',
		configureServer(server) {
			// Registered directly (not from the returned post hook) so the rewritten
			// URL is what Vite's static middleware gets to see.
			server.middlewares.use((req, _res, next) => {
				const proceed = () => {
					const rewritten = rewriteTrailingSlash(distRoot, req.url);
					if (rewritten !== undefined) req.url = rewritten;
					next();
				};
				// Hold the request while dist/ is being rewritten, so a reload that
				// races the build waits ~100ms instead of landing on a 404.
				if (rebuilding) void rebuilding.then(proceed, proceed);
				else proceed();
			});
		},
	};
}

/**
 * Maps a trailing-slash request URL to the `.html` file that backs it.
 *
 * @param distRoot - Absolute path of the served build output
 * @param url - Request URL, possibly with a query string
 * @returns The rewritten URL, or `undefined` to leave the request alone
 */
function rewriteTrailingSlash(distRoot: string, url: string | undefined): string | undefined {
	if (!url) return undefined;
	const queryStart = url.search(/[?#]/);
	const path = queryStart === -1 ? url : url.slice(0, queryStart);
	const query = queryStart === -1 ? '' : url.slice(queryStart);

	// The root and non-directory requests are already handled correctly.
	if (!path.endsWith('/') || path === '/') return undefined;

	let name: string;
	try {
		name = decodeURIComponent(path.slice(1, -1));
	} catch {
		return undefined; // Malformed percent-encoding; not ours to serve.
	}

	// A real `foo/index.html` wins, exactly as it does on Pages.
	if (existsSync(resolve(distRoot, name, 'index.html'))) return undefined;

	const filePath = resolve(distRoot, `${name}.html`);
	if (!filePath.startsWith(distRoot + sep)) return undefined; // Escaped dist/.
	if (!existsSync(filePath)) return undefined;

	return `/${name}.html${query}`;
}

export default defineConfig({
	root: config.distDir,
	// The site is a set of independent pages, not a single-page app. Without
	// this Vite falls back to index.html for any unknown path, so a broken link
	// would render as 200 instead of the 404 it will be in production.
	appType: 'mpa',
	server: {
		port: config.devServerPort,
		// Finder scatters these through docs/; rebuilding for them is pure noise.
		//
		// dist/ deliberately stays watched even though it is Vite's own root and
		// the builder rewrites all of it: ignoring it stops Vite from invalidating
		// its transform cache, and the browser then gets stale CSS forever while
		// the file on disk is current. The reload storm that watching causes is
		// harmless because the middleware below holds requests until the build is
		// finished — that, not the watcher, is what fixes the 404 after an edit.
		watch: { ignored: ['**/.DS_Store'] },
		// `root` is dist/, but the plugin imports the builder from src/.
		fs: { allow: [ROOT] },
	},
	plugins: [buildSite(), pagesUrls()],
});
