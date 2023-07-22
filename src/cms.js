
import Handlebars from 'handlebars';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectPath = resolve(fileURLToPath(import.meta.url), '../../');

const config = {
	src: {
		pages: resolve(projectPath, 'docs/pages'),
		assets: resolve(projectPath, 'docs/assets'),
		graphics: resolve(projectPath, 'docs/graphics'),
		helpers: resolve(projectPath, 'docs/helpers'),
		partials: resolve(projectPath, 'docs/partials'),
	},
	dst: {
		root: resolve(projectPath, 'dist'),
		assets: resolve(projectPath, 'dist/assets'),
	}
}

await build()

async function build() {
	let handlebars = Handlebars.create();

	if (existsSync(config.dst.root)) rmSync(config.dst.root, { recursive: true });
	mkdirSync(config.dst.root);

	await (await import('./lib/assets.js')).copyAssets(config, handlebars);
	await (await import('./lib/helpers.js')).installHelpers(config, handlebars);
	await (await import('./lib/partials.js')).installPartials(config, handlebars);
	await (await import('./lib/pages.js')).processPages(config, handlebars);
}
