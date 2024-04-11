import type Handlebars from 'handlebars';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Configuration } from './config.ts';
import { HelperDelegate } from 'handlebars';

export async function build(config: Configuration, handlebars: typeof Handlebars) {
	await register('helpers');
	await register('charts');

	async function register(name: string) {
		let path = resolve(config.srcPath, name);

		for (let filename of readdirSync(path)) {
			if (!filename.endsWith('.ts')) continue;

			let name = filename.replace(/\..*?$/, '');
			let fullname = resolve(path, filename) + '?version=' + Date.now();

			let fun: HelperDelegate = (await import(fullname)).default;

			handlebars.registerHelper(name, (...args) => {
				try {
					return fun(...args)
				} catch (err) {
					console.error(err);
					return '<h1 style="color:red">' + String(err) + '</h1>'
				}
			});
		}
	}
}
