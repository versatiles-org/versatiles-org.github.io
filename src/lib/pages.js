
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import colors from 'colors';

export function build(config, handlebars) {
	readdirSync(config.src.pages).forEach(filename => {
		if (!filename.endsWith('.html')) return;

		let page = readFileSync(resolve(config.src.pages, filename), 'utf8');
		try {
			page = handlebars.compile(page, { strict: true });
			page = page();
		} catch (err) {
			console.error(colors.red.bold('Error in ' + filename));
			throw err;
		}
		writeFileSync(resolve(config.dst.root, filename), page);
	})
}
