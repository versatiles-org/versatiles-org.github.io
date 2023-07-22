
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function installPartials(config, Handlebars) {
	installHTMLPartials();

	function installHTMLPartials() {
		let partials = {};
		readdirSync(config.src.partials).forEach(filename => {
			if (!filename.endsWith('.html')) return;

			let name = filename.slice(0, -5);
			let content = readFileSync(resolve(config.src.partials, filename), 'utf8');

			partials[name] = content;
		})

		Handlebars.registerPartial(partials);
	}
}
