
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

	run('build', config, handlebars);
}

async function run(command, ...args) {
	let modules = [
		'assets',
		'helpers',
		'partials',
		'pages',
	]

	for (let module of modules) {
		module = `./lib/${module}.js`;
		module = await import(module);
		await module[command](...args)
	}
}
