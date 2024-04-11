import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Configuration } from './config.ts';

export function build(config: Configuration, handlebars: typeof Handlebars) {
	let path = resolve(config.srcPath, 'partials');

	for (let filename of readdirSync(path)) {
		if (!filename.endsWith('.html')) continue;

		let name = filename.replace(/\..*?$/, '');
		let fullname = resolve(path, filename);

		handlebars.registerPartial(name, readFileSync(fullname, 'utf8'));
	}
}
