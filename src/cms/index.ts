import { copySync, ensureDirSync, existsSync, walkSync } from '@std/fs';
import { resolve } from '@std/path/resolve';
import { basename } from '@std/path/basename';
import { buildCSS } from './css.ts';
import { parseMarkdown } from './markdown.ts';
import { MenuEntry, Page } from './page.ts';

const template = Deno.readTextFileSync('./docs/templates/page.html');

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
		copySync(
			resolve(this.srcPath, 'assets'),
			resolve(this.dstPath, 'assets'),
		);
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

		for (const entry of Deno.readDirSync(srcPath)) {
			if (!entry.isFile) continue;
			const filename = entry.name;
			if (!filename.endsWith('.md')) continue;
			const yaml = Deno.readTextFileSync(resolve(srcPath, filename));
			const { html, attrs } = parseMarkdown(yaml);

			const githubLink = attrs.githubLink ||
				`https://github.com/versatiles-org/versatiles-org.github.io/tree/main/docs/${filename}`;

			const pageHTML = new Page(template)
				.setMenu(menu, attrs.menuEntry)
				.setTitle(attrs.title)
				.setContent(html)
				.setGithubLink(githubLink)
				.render();

			const pagename = basename(filename, '.md');
			Deno.writeTextFileSync(resolve(dstPath, pagename + '.html'), pageHTML);
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
