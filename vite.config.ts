import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
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
	let building = false;
	let dirty = false;

	async function rebuild(server: ViteDevServer) {
		// Coalesce edits that land mid-build instead of running them in parallel.
		if (building) {
			dirty = true;
			return;
		}
		building = true;
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
		building = false;
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

export default defineConfig({
	root: config.distDir,
	// The site is a set of independent pages, not a single-page app. Without
	// this Vite falls back to index.html for any unknown path, so a broken link
	// would render as 200 instead of the 404 it will be in production.
	appType: 'mpa',
	server: {
		port: config.devServerPort,
		// Finder scatters these through docs/; rebuilding for them is pure noise.
		watch: { ignored: ['**/.DS_Store'] },
		// `root` is dist/, but the plugin imports the builder from src/.
		fs: { allow: [ROOT] },
	},
	plugins: [buildSite()],
});
