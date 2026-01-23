import { copySync, ensureDirSync, existsSync, walkSync } from '@std/fs';
import { dirname, relative, resolve } from '@std/path';
import { buildCSS } from './css.ts';
import { parseMarkdown } from './markdown.ts';
import { Page } from 'cheerio_cms';
import { config } from '../config.ts';

const template = Deno.readTextFileSync('./templates/page.html');

export default class CMS {
	private readonly srcPath: string;

	private readonly dstPath: string;

	public constructor(srcPath: string, dstPath: string) {
		this.srcPath = srcPath;
		this.dstPath = dstPath;
	}

	public async build() {
		this.clearFolder();
		this.copyAssets();
		await this.buildCSS();
		this.buildPages();
		this.cleanUp();
	}

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

	private async buildCSS(): Promise<void> {
		const srcFiles = [
			resolve(this.srcPath, 'assets/style/main.less'),
			resolve(this.srcPath, 'assets/style/menu.less'),
			resolve(this.srcPath, 'assets/style/hero.less'),
		];
		const dstFile = resolve(this.dstPath, 'assets/style.css');
		try {
			await buildCSS(srcFiles, dstFile);
		} catch (error) {
			throw new Error(`Failed to build CSS from [${srcFiles.join(', ')}] to "${dstFile}"`, {
				cause: error,
			});
		}
	}

	private buildPages() {
		const { srcPath, dstPath } = this;

		for (const entry of walkSync(srcPath)) {
			if (!entry.isFile) continue;

			try {
				let pageHTML: string;
				const relativePath = relative(srcPath, entry.path);

				if (entry.name.endsWith('.md')) {
					const yaml = Deno.readTextFileSync(entry.path);
					const { html, attrs } = parseMarkdown(yaml);

					const githubLink = attrs.githubLink ||
						`${config.githubRepo}/tree/${config.githubBranch}/${config.docsDir}/${relativePath}`;

					pageHTML = new Page(template)
						.setMenu(config.menu, attrs.menuEntry, config.githubOrg)
						.setTitle(attrs.title, attrs.description)
						.setContent(html)
						.setGithubLink(githubLink)
						.render();
				} else if (entry.name.endsWith('.html')) {
					pageHTML = Deno.readTextFileSync(entry.path);
				} else {
					continue;
				}

				const htmlFileName = resolve(dstPath, relativePath.replace(/\.[a-z]+$/, '.html'));
				ensureDirSync(dirname(htmlFileName));
				Deno.writeTextFileSync(htmlFileName, pageHTML);
			} catch (error) {
				throw new Error(`Failed to process page "${entry.path}"`, { cause: error });
			}
		}
	}

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
