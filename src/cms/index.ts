import { copySync, ensureDirSync, existsSync, walkSync } from '@std/fs';
import { dirname, relative, resolve } from '@std/path';
import { buildCSS } from './css.ts';
import { buildDynamicPage } from './dynamic.ts';
import { parseMarkdown } from './markdown.ts';
import { Page } from 'cheerio_cms';
import { config } from '../config.ts';

let template: string;
try {
	template = Deno.readTextFileSync('./templates/page.html');
} catch (error) {
	throw new Error('Failed to read template file "./templates/page.html"', { cause: error });
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
		await this.buildPages();
		this.cleanUp();
	}

	/** Removes existing destination folder and creates a fresh empty one. */
	private clearFolder() {
		try {
			if (existsSync(this.dstPath)) Deno.removeSync(this.dstPath, { recursive: true });
			ensureDirSync(this.dstPath);
		} catch (error) {
			throw new Error(`Failed to clear/create destination folder "${this.dstPath}"`, {
				cause: error,
			});
		}
	}

	/** Copies image assets from source to destination, preserving directory structure. */
	private copyAssets() {
		for (const entry of walkSync(this.srcPath)) {
			if (!entry.isFile) continue;
			if (!config.assetExtensions.test(entry.name)) continue;
			const relativePath = relative(this.srcPath, entry.path);
			const dstFileName = resolve(this.dstPath, relativePath);
			try {
				ensureDirSync(dirname(dstFileName));
				copySync(entry.path, dstFileName);
			} catch (error) {
				throw new Error(`Failed to copy asset "${entry.path}" to "${dstFileName}"`, {
					cause: error,
				});
			}
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

		for (const entry of walkSync(srcPath)) {
			if (!entry.isFile) continue;

			try {
				let pageHTML: string;
				const relativePath = relative(srcPath, entry.path);

				if (entry.name.endsWith('.page.ts')) {
					const result = await buildDynamicPage(entry.path);

					const githubLink = result.githubLink ||
						`${config.githubRepo}/tree/${config.githubBranch}/${config.docsDir}/${relativePath}`;

					const canonicalPath = relativePath.replace(/\.page\.ts$/, '.html').replace(
						/index\.html$/,
						'',
					);
					const canonicalUrl = `${config.baseUrl}/${canonicalPath}`;

					pageHTML = new Page(template)
						.setMenu(config.menu, result.menuEntry, config.githubOrg)
						.setTitle(result.title, result.description)
						.setContent(result.html)
						.setGithubLink(githubLink)
						.addHead(`<link rel="canonical" href="${canonicalUrl}" />`)
						.render();
				} else if (entry.name.endsWith('.md')) {
					const yaml = Deno.readTextFileSync(entry.path);
					const { html, attrs } = parseMarkdown(yaml);

					const githubLink = attrs.githubLink ||
						`${config.githubRepo}/tree/${config.githubBranch}/${config.docsDir}/${relativePath}`;

					const canonicalPath = relativePath.replace(/\.md$/, '.html').replace(
						/index\.html$/,
						'',
					);
					const canonicalUrl = `${config.baseUrl}/${canonicalPath}`;

					pageHTML = new Page(template)
						.setMenu(config.menu, attrs.menuEntry, config.githubOrg)
						.setTitle(attrs.title, attrs.description)
						.setContent(html)
						.setGithubLink(githubLink)
						.addHead(`<link rel="canonical" href="${canonicalUrl}" />`)
						.render();
				} else if (entry.name.endsWith('.html')) {
					pageHTML = Deno.readTextFileSync(entry.path);
				} else {
					continue;
				}

				const htmlFileName = resolve(
					dstPath,
					relativePath.replace(/\.page\.ts$|\.md$|\.html$/, '.html'),
				);
				ensureDirSync(dirname(htmlFileName));
				Deno.writeTextFileSync(htmlFileName, pageHTML);
			} catch (error) {
				throw new Error(`Failed to process page "${entry.path}"`, { cause: error });
			}
		}
	}

	/** Removes temporary files (.DS_Store, .less) from the built assets folder. */
	private cleanUp() {
		for (const entry of walkSync(resolve(this.dstPath, 'assets'))) {
			if (!entry.isFile) continue;
			const extension = entry.name.split('.').pop()?.toLowerCase();
			if (extension === 'ds_store' || extension === 'less') {
				try {
					Deno.removeSync(entry.path);
				} catch (error) {
					throw new Error(`Failed to remove temporary file "${entry.path}"`, { cause: error });
				}
			}
		}
	}
}
