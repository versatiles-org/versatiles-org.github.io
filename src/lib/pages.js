
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import colors from 'colors';

export function build(config, handlebars) {
	let path = resolve(config.srcPath, 'pages');

	readdirSync(path).forEach(filename => {
		if (!filename.endsWith('.html')) return;

		let pagename = filename.replace(/\..*?$/, '');

		let page = readFileSync(resolve(path, filename), 'utf8');
		try {
			page = handlebars.compile(page, { strict: true });
			page = page({ pagename, filename });
		} catch (err) {
			console.error(colors.red.bold('Error in ' + filename));
			throw err;
		}
		writeFileSync(resolve(config.dstPath, filename), page);
	})
}
