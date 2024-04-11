import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import colors from 'colors';
import Context from '../lib/context.ts';

export function build(context: Context) {
	let path = resolve(context.srcPath, 'pages');

	readdirSync(path).forEach(filename => {
		if (!filename.endsWith('.md')) return;

		let pagename = filename.replace(/\..*?$/, '');

		let page = readFileSync(resolve(path, filename), 'utf8');
		try {
			page = context.md.render(page);
		} catch (err) {
			console.error(colors.red.bold('Error in ' + filename));
			throw err;
		}
		writeFileSync(resolve(context.dstPath, filename), page);
	})
}
