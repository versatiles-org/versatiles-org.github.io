
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function build(config, handlebars) {
	let path = resolve(config.srcPath, 'partials');

	for (let filename of readdirSync(path)) {
		if (!filename.endsWith('.html')) continue;

		let name = filename.replace(/\..*?$/, '');
		let fullname = resolve(path, filename);

		handlebars.registerPartial(name, readFileSync(fullname, 'utf8'));
	}
}
