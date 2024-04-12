import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { WrappedProcessor, getHandlebars, getPartials, getProcessor } from './modules.ts';
import { generateMenu } from './menu.ts';

export default class CMS {
	private readonly srcPath: string;
	private readonly dstPath: string;
	private readonly mdProcessor: WrappedProcessor;

	constructor(srcPath: string, dstPath: string) {
		this.srcPath = srcPath;
		this.dstPath = dstPath;
		this.mdProcessor = getProcessor();
	}

	async build(changed?: string) {
		await this.clearFolder();
		await Promise.all([
			this.copyAssets(),
			this.buildPages(),
		])
	}

	private async clearFolder() {
		if (existsSync(this.dstPath)) await rm(this.dstPath, { recursive: true });
		await mkdir(this.dstPath);
	}

	async copyAssets() {
		await cp(
			resolve(this.srcPath, 'assets'),
			resolve(this.dstPath, 'assets'),
			{ recursive: true }
		)
	}

	async buildPages() {
		const path = resolve(this.srcPath, 'pages');

		const filenames = (await readdir(path)).flatMap(filename => {
			return filename.endsWith('.md') ? [filename] : []
		});

		const { srcPath, dstPath, mdProcessor } = this;

		const partials = getPartials(srcPath);
		const handlebars = await getHandlebars(srcPath, dstPath);

		await Promise.all(filenames.map(async filename => {
			await buildPage(resolve(path, filename));
		}))

		async function buildPage(fullname: string) {
			const filename = basename(fullname);
			const pagename = basename(filename, '.md');

			try {
				const content = await readFile(fullname, 'utf8');
				const { text, data } = await mdProcessor(content);

				if (!('title' in data) || (typeof data.title !== 'string')) throw Error('missing title');

				let html = [
					partials.header,
					text,
					partials.footer
				].join('\n');

				html = handlebars.compile(html)({
					...data,
					menu: generateMenu(filename),
					github_link: `https://github.com/versatiles-org/versatiles-website/blob/main/docs/pages/${filename}`,
				});

				await writeFile(resolve(dstPath, pagename + '.html'), html);

			} catch (error) {
				console.error('Error for page ' + pagename);
				throw error;
			}
		}
	}
}
