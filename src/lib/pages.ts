import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import colors from 'colors';
import { Configuration } from './config.ts';

export function build(config: Configuration, handlebars: typeof Handlebars) {
	let path = resolve(config.srcPath, 'pages');

	readdirSync(path).forEach(filename => {
		if (!filename.endsWith('.html')) return;

		let pagename = filename.replace(/\..*?$/, '');

		let page = readFileSync(resolve(path, filename), 'utf8');
		try {
			page = handlebars.compile(page, { strict: true })({ pagename, filename });
		} catch (err) {
			console.error(colors.red.bold('Error in ' + filename));
			throw err;
		}
		writeFileSync(resolve(config.dstPath, filename), page);
	})
}
