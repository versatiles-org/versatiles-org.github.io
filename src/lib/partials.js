
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function build(config, handlebars) {
	for (let filename of readdirSync(config.src.partials)) {
		if (!filename.endsWith('.html')) continue;

		let name = filename.replace(/\..*?$/, '');
		let fullname = resolve(config.src.partials, filename);

		handlebars.registerPartial(name, readFileSync(fullname, 'utf8'));
	}
}
