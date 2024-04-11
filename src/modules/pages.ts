import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import Handlebars from 'handlebars';
import Context from '../lib/context.ts';

export async function build(context: Context) {
	const path = resolve(context.srcPath, 'pages');

	const [header, footer] = await Promise.all(
		['header', 'footer'].map(getPartial)
	);

	const filenames = (await readdir(path)).flatMap(filename => {
		return filename.endsWith('.md') ? [filename] : []
	});

	await Promise.all(filenames.map(async filename => {
		const pagename = basename(filename, '.md');
		try {
			const content = await readFile(resolve(path, filename), 'utf8');
			const result = await context.md.process(content);
			const data = result.data.matter;

			if (typeof data !== 'object' || data == null) throw Error('missing data');
			if (!('title' in data) || (typeof data.title !== 'string')) throw Error('missing title');

			const html = header(data) + result.toString() + footer(data);
			await writeFile(resolve(context.dstPath, pagename + '.html'), html);
		} catch (error) {
			console.error('Error for page ' + pagename);
			throw error;
		}
	}))

	async function getPartial(name: string): Promise<HandlebarsTemplateDelegate<any>> {
		const filename = resolve(context.srcPath, `partials/${name}.html`);
		const html = await readFile(filename, 'utf8');
		return Handlebars.compile(html);
	}
}
