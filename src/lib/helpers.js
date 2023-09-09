
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export async function build(config, handlebars) {
	await register('helpers');
	await register('charts');

	async function register(name) {
		let path = resolve(config.srcPath, name);

		for (let filename of readdirSync(path)) {
			if (!filename.endsWith('.js')) continue;

			let name = filename.replace(/\..*?$/, '');
			let fullname = resolve(path, filename) + '?version=' + Date.now();

			let { default: fun } = await import(fullname);

			handlebars.registerHelper(name, (...args) => {
				try {
					return fun(...args)
				} catch (err) {
					console.error(err);
					return '<h1 style="color:red">' + err.toString() + '</h1>'
				}
			});
		}
	}
}
