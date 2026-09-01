import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { extractYaml } from '@std/front-matter';
import { walkFiles } from './walk.ts';
import { buildCSS } from './css.ts';
import { renderCardsFromFile } from './cards.ts';
import { processCardImages } from './cardImages.ts';
import { buildDynamicPage } from './dynamic.ts';
import { parseMarkdown } from './markdown.ts';
import { inlineSponsorSvg } from '../sponsors/inlineSvg.ts';
import { Page } from 'cheerio_cms';
import { config } from '../config.ts';

let template: string;
try {
	template = readFileSync('./templates/page.html', 'utf8');
} catch (error) {
	throw new Error('Failed to read template file "./templates/page.html"', { cause: error });
}

/**
 * Builds the absolute URL a page will be reachable at, for og:url and rel=canonical.
 *
 * GitHub Pages serves `foo.html` at `/foo` and `/foo.html`, but NOT at `/foo/` —
 * the trailing-slash form only resolves where a real directory with an
 * `index.html` exists, and then `/foo` 301s to it. A page that wants the
 * trailing-slash URL (as `rel=canonical` claims here) therefore has to be
 * authored as `foo/index.md`, not `foo.md`, or the canonical URL is a 404.
 *
 * @param relativePath - Page path relative to the docs directory, e.g. `sources/index.page.ts`
 * @returns Absolute URL, e.g. `https://versatiles.org/sources/`
 *
 * @example
 * ```ts
 * canonicalUrl('index.html');    // "https://versatiles.org/"
 * canonicalUrl('playground.md'); // "https://versatiles.org/playground/"
 * ```
 */
export function canonicalUrl(relativePath: string): string {
	const path = relativePath.replace(/\.page\.ts$|\.md$|\.html$/, '').replace(/(^|\/)index$/, '');
	return `${config.baseUrl}/${path ? `${path}/` : ''}`;
}

/**
 * Content Management System for building the VersaTiles static website.
 *
 * Handles the complete build pipeline:
 * - Copying static assets (images)
 * - Compiling LESS to CSS
 * - Converting Markdown to HTML pages
 * - Cleaning up temporary files
 *
 * @example
 * ```ts
 * const cms = new CMS('./docs', './dist');
 * await cms.build();
 * ```
 */
/** Front matter fields a page must supply. */
interface PageAttrs {
	menuEntry: string;
	title: string;
	description: string;
	githubLink?: string;
	lang?: string;
	layout?: string;
	socialImage?: string;
	socialImageAlt?: string;
}

/**
 * Validates the YAML front matter of an `.html` page.
 *
 * `parseMarkdown` already does this for `.md` pages. Without the same check
 * here, a missing field reached the template as `undefined` and rendered
 * literally into the page instead of failing the build.
 *
 * @param attrs - Parsed front matter
 * @param filePath - Page being processed, for the error message
 * @throws {TypeError} If a required field is missing or not a string
 */
function readPageAttrs(attrs: unknown, filePath: string): PageAttrs {
	const fail = (reason: string): never => {
		throw new TypeError(`Front matter of "${filePath}" ${reason}`);
	};

	if (typeof attrs !== 'object' || attrs === null) return fail('must be an object');
	const { menuEntry, title, description, githubLink, lang, layout, socialImage, socialImageAlt } =
		attrs as Record<string, unknown>;

	if (typeof menuEntry !== 'string') return fail('must contain a string "menuEntry"');
	if (typeof title !== 'string') return fail('must contain a string "title"');
	if (typeof description !== 'string') return fail('must contain a string "description"');
	if (githubLink !== undefined && typeof githubLink !== 'string') {
		return fail('must contain a string "githubLink", if present');
	}
	if (lang !== undefined && typeof lang !== 'string') {
		return fail('must contain a string "lang", if present');
	}
	if (layout !== undefined && typeof layout !== 'string') {
		return fail('must contain a string "layout", if present');
	}
	if (socialImage !== undefined && typeof socialImage !== 'string') {
		return fail('must contain a string "socialImage", if present');
	}
	if (socialImageAlt !== undefined && typeof socialImageAlt !== 'string') {
		return fail('must contain a string "socialImageAlt", if present');
	}

	return {
		menuEntry,
		title,
		description,
		githubLink,
		lang,
		layout,
		socialImage,
		socialImageAlt,
	};
}

/**
 * Turns a `layout` front-matter value into the class name put on `<main>`.
 *
 * The value ends up in the markup verbatim, so anything but a plain identifier
 * is rejected rather than escaped — a layout name is ours to choose, and a
 * stray quote would otherwise break the tag it lands in.
 *
 * @param layout - Front matter value, e.g. `prose`
 * @returns The class name to add
 * @throws {TypeError} If the name is not lowercase letters, digits and dashes
 */
function layoutClass(layout: string): string {
	if (!/^[a-z][a-z0-9-]*$/.test(layout)) {
		throw new TypeError(
			`Front matter "layout" must be lowercase letters, digits and dashes, got "${layout}"`,
		);
	}
	return layout;
}

export default class CMS {
	/** Source directory containing markdown files and assets */
	private readonly srcPath: string;

	/** Destination directory for the built website */
	private readonly dstPath: string;

	/**
	 * Creates a new CMS instance.
	 * @param srcPath - Path to source directory containing content and assets
	 * @param dstPath - Path to destination directory for built output
	 */
	public constructor(srcPath: string, dstPath: string) {
		this.srcPath = srcPath;
		this.dstPath = dstPath;
	}

	/**
	 * Builds the complete website.
	 *
	 * Executes the build pipeline in order:
	 * 1. Clears the destination folder
	 * 2. Copies static assets
	 * 3. Compiles CSS from LESS files
	 * 4. Builds HTML pages from Markdown
	 * 5. Removes temporary files
	 *
	 * @throws {Error} If any build step fails
	 */
	public async build() {
		this.clearFolder();
		this.copyAssets();
		await this.buildCSS();
		await this.buildCardImages();
		await this.buildPages();
		this.cleanUp();
	}

	/** Removes existing destination folder and creates a fresh empty one. */
	private clearFolder() {
		try {
			if (existsSync(this.dstPath)) rmSync(this.dstPath, { recursive: true });
			mkdirSync(this.dstPath, { recursive: true });
		} catch (error) {
			throw new Error(`Failed to clear/create destination folder "${this.dstPath}"`, {
				cause: error,
			});
		}
	}

	/** Copies image assets from source to destination, preserving directory structure. */
	private copyAssets() {
		const cardImagesSrc = resolve(this.srcPath, config.cardImagesSrcDir);
		for (const entry of walkFiles(this.srcPath)) {
			if (!config.assetExtensions.test(entry.name)) continue;
			// Source PNGs for card thumbnails are processed into WebP via the
			// dedicated card-image pipeline; don't ship the raw PNGs.
			if (entry.path.startsWith(cardImagesSrc) && /\.png$/i.test(entry.name)) continue;
			const relativePath = relative(this.srcPath, entry.path);
			const dstFileName = resolve(this.dstPath, relativePath);
			try {
				mkdirSync(dirname(dstFileName), { recursive: true });
				// `force` because a clean dist is not guaranteed: `npm run dev`
				// can start a second build while the first is still copying, and
				// the copy otherwise trips over the file it already wrote.
				cpSync(entry.path, dstFileName, { force: true });
			} catch (error) {
				throw new Error(`Failed to copy asset "${entry.path}" to "${dstFileName}"`, {
					cause: error,
				});
			}
		}
	}

	/** Processes card thumbnail PNGs into WebPs sized for the front-page grid. */
	private async buildCardImages(): Promise<void> {
		const srcDir = resolve(this.srcPath, config.cardImagesSrcDir);
		const dstDir = resolve(this.dstPath, config.cardImagesDstDir);
		try {
			await processCardImages(srcDir, dstDir);
		} catch (error) {
			throw new Error(`Failed to process card images from "${srcDir}" to "${dstDir}"`, {
				cause: error,
			});
		}
	}

	/** Compiles LESS files into a single minified CSS file. */
	private async buildCSS(): Promise<void> {
		const srcFiles = config.cssSourceFiles.map((file) => resolve(this.srcPath, file));
		const dstFile = resolve(this.dstPath, config.cssOutputFile);
		try {
			await buildCSS(srcFiles, dstFile);
		} catch (error) {
			throw new Error(`Failed to build CSS from [${srcFiles.join(', ')}] to "${dstFile}"`, {
				cause: error,
			});
		}
	}

	/** Converts Markdown and dynamic .page.ts files to HTML pages using the page template. */
	private async buildPages() {
		const { srcPath, dstPath } = this;

		// Render the discovery cards once; the result is injected into any page
		// that contains a <!-- cards --> placeholder.
		const cardsYamlPath = resolve(srcPath, config.cardsYamlFile);
		// Check image existence against `dstPath` because the renderer references
		// processed WebP files that buildCardImages just wrote there.
		const cardsHtml = existsSync(cardsYamlPath)
			? renderCardsFromFile(cardsYamlPath, { imageBaseDir: dstPath })
			: '';

		// Inline the sponsor graphic rather than referencing it with <img>, which
		// would leave the per-sponsor links inside it unclickable. Absent on a
		// fresh checkout — SponsorKit writes it at deploy time — so the page
		// simply renders without the graphic when it is missing.
		const sponsorsSvgPath = resolve(srcPath, config.sponsorsSvgFile);
		const sponsorsSvg = existsSync(sponsorsSvgPath)
			? inlineSponsorSvg(readFileSync(sponsorsSvgPath, 'utf8'))
			: '';

		const applyPlaceholders = (html: string) =>
			html
				.replaceAll('<!-- cards -->', cardsHtml)
				.replaceAll('<!-- sponsors-svg -->', sponsorsSvg);

		for (const entry of walkFiles(srcPath)) {
			// The cards data file is consumed via the placeholder, not as a page.
			if (entry.path === cardsYamlPath) continue;

			try {
				let pageHTML: string;
				const relativePath = relative(srcPath, entry.path);

				if (entry.name.endsWith('.page.ts')) {
					const result = await buildDynamicPage(entry.path);
					pageHTML = this.renderPage(
						relativePath,
						result.menuEntry,
						result.title,
						result.description,
						applyPlaceholders(result.html),
						result.githubLink,
						result.lang,
						result.layout,
						result.socialImage,
						result.socialImageAlt,
					);
				} else if (entry.name.endsWith('.md')) {
					const yaml = readFileSync(entry.path, 'utf8');
					const { html, attrs } = parseMarkdown(yaml);
					pageHTML = this.renderPage(
						relativePath,
						attrs.menuEntry,
						attrs.title,
						attrs.description,
						applyPlaceholders(html),
						attrs.githubLink,
						attrs.lang,
						attrs.layout,
						attrs.socialImage,
						attrs.socialImageAlt,
					);
				} else if (entry.name.endsWith('.html')) {
					const content = readFileSync(entry.path, 'utf8');
					if (content.startsWith('---\n')) {
						const { body, attrs } = extractYaml(content);
						const a = readPageAttrs(attrs, entry.path);
						pageHTML = this.renderPage(
							relativePath,
							a.menuEntry,
							a.title,
							a.description,
							applyPlaceholders(body),
							a.githubLink,
							a.lang,
							a.layout,
							a.socialImage,
							a.socialImageAlt,
						);
					} else {
						pageHTML = applyPlaceholders(content);
					}
				} else {
					continue;
				}

				const htmlFileName = resolve(
					dstPath,
					relativePath.replace(/\.page\.ts$|\.md$|\.html$/, '.html'),
				);
				mkdirSync(dirname(htmlFileName), { recursive: true });
				writeFileSync(htmlFileName, pageHTML);
			} catch (error) {
				throw new Error(`Failed to process page "${entry.path}"`, { cause: error });
			}
		}
	}

	/** Renders a page from its metadata and content using the shared template. */
	private renderPage(
		relativePath: string,
		menuEntry: string,
		title: string,
		description: string,
		html: string,
		githubLink?: string,
		lang?: string,
		layout?: string,
		socialImage?: string,
		socialImageAlt?: string,
	): string {
		const resolvedGithubLink =
			githubLink ||
			`${config.githubRepo}/tree/${config.githubBranch}/${config.docsDir}/${relativePath}`;

		return (
			new Page(template)
				.setSocialImage(
					socialImage
						? new URL(socialImage, config.baseUrl).href
						: `${config.baseUrl}/assets/social.png`,
				)
				.setMenu(config.menu, menuEntry, config.githubOrg)
				.setTitle(title, description)
				.setContent(html)
				.setGithubLink(resolvedGithubLink)
				.render()
				// cheerio_cms has no setter for og:url/canonical, so the template carries a
				// placeholder that we fill in with this page's own URL.
				.replaceAll('{{canonicalUrl}}', canonicalUrl(relativePath))
				// The template is English; a page in another language declares it via
				// front matter so screen readers and translators get the right language.
				.replace('<html lang="en">', `<html lang="${lang ?? 'en'}">`)
				// Layout styles (e.g. prose.less) hang off a class on <main>, so a page
				// can opt into them without the landing page's own styles changing.
				.replace(
					'class="markdown-body"',
					`class="markdown-body${layout ? ` ${layoutClass(layout)}` : ''}"`,
				)
				// cheerio_cms sets og:image but not its alt text, which the template
				// carries for the default graphic. A page with its own image needs its
				// own description of it.
				.replaceAll(
					'VersaTiles — a complete FLOSS map stack',
					socialImageAlt ?? 'VersaTiles — a complete FLOSS map stack',
				)
				// Add aria-label to the GitHub nav icon (cheerio_cms generates it without one)
				.replace(
					'<li class="github-icon"><a ',
					'<li class="github-icon"><a aria-label="GitHub" ',
				)
				// Add rel="noopener" to target="_blank" links without it. The check has
				// to span the whole tag: `rel` may be written before `target`, and only
				// looking after it appended a second, duplicate attribute.
				.replace(/<a\s([^>]*\btarget="_blank"[^>]*)>/g, (tag, attrs: string) =>
					/(?:^|\s)rel=/.test(attrs) ? tag : `<a ${attrs} rel="noopener">`,
				)
		);
	}

	/** Removes temporary files (.DS_Store, .less) from the built assets folder. */
	private cleanUp() {
		for (const entry of walkFiles(resolve(this.dstPath, 'assets'))) {
			const extension = entry.name.split('.').pop()?.toLowerCase();
			if (extension === 'ds_store' || extension === 'less') {
				try {
					rmSync(entry.path);
				} catch (error) {
					throw new Error(`Failed to remove temporary file "${entry.path}"`, { cause: error });
				}
			}
		}
	}
}
