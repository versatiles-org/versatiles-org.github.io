import { copySync, ensureDirSync, existsSync, walkSync } from '@std/fs';
import { dirname, relative, resolve } from '@std/path';
import { buildCSS } from './css.ts';
import { parseMarkdown } from './markdown.ts';
import { MenuEntry, Page } from 'cheerio_cms';

const template = Deno.readTextFileSync('./templates/page.html');

const menu: MenuEntry[] = [
	{ title: 'Overview', url: 'https://versatiles.org/' },
	{ title: 'Playground', url: 'https://versatiles.org/playground/' },
	{ title: 'Tools', url: 'https://versatiles.org/tools/' },
	{ title: 'Documentation', url: 'https://docs.versatiles.org/' },
];

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
		if (existsSync(this.dstPath)) Deno.removeSync(this.dstPath, { recursive: true });
		ensureDirSync(this.dstPath);
	}

	private copyAssets() {
		for (const entry of walkSync(this.srcPath)) {
			if (!entry.isFile) continue;
			if (!entry.name.match(/\.(png|jpg|jpeg|gif|svg|webp|ico?)$/i)) continue;
			const relativePath = relative(this.srcPath, entry.path);
			const dstFileName = resolve(this.dstPath, relativePath);
			ensureDirSync(dirname(dstFileName));
			copySync(entry.path, dstFileName);
		}
	}

	private async buildCSS(): Promise<void> {
		await buildCSS([
			resolve(this.srcPath, 'assets/style/main.less'),
			resolve(this.srcPath, 'assets/style/menu.less'),
			resolve(this.srcPath, 'assets/style/hero.less'),
		], resolve(this.dstPath, 'assets/style.css'));
	}

	private buildPages() {
		const { srcPath, dstPath } = this;

		for (const entry of walkSync(srcPath)) {
			if (!entry.isFile) continue;
			const filename = entry.name;

			try {
				let pageHTML: string;
				const relativePath = relative(srcPath, entry.path);

				if (entry.name.endsWith('.md')) {
					const yaml = Deno.readTextFileSync(entry.path);
					const { html, attrs } = parseMarkdown(yaml);

					const githubLink = attrs.githubLink ||
						`https://github.com/versatiles-org/versatiles-org.github.io/tree/main/docs/${relativePath}`;

					pageHTML = new Page(template)
						.setMenu(menu, attrs.menuEntry, 'https://github.com/versatiles-org/')
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
				throw Error(`Error processing ${filename}:`, { cause: String(error) });
			}
		}
	}

	private cleanUp() {
		for (const entry of walkSync(resolve(this.dstPath, 'assets'))) {
			if (!entry.isFile) continue;
			const extension = entry.name.split('.').pop()?.toLowerCase();
			if (extension === 'ds_store' || extension === 'less') {
				Deno.removeSync(entry.path);
			}
		}
	}
}
