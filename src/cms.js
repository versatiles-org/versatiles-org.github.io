
import Handlebars from 'handlebars';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectPath = resolve(fileURLToPath(import.meta.url), '../../');

const config = {
	src: {
		root: resolve(projectPath, 'docs'),
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

if (existsSync(config.dst.root)) rmSync(config.dst.root, { recursive: true });
mkdirSync(config.dst.root);

await build();

if (process.argv[2] === 'watch') {
	watch(config.src.root, { recursive: true }, async () => { await build() });
}

async function build() {
	let t = Date.now();
	let handlebars = Handlebars.create();

	let modules = [
		'assets',
		'helpers',
		'partials',
		'pages',
	]

	for (let module of modules) {
		module = `./lib/${module}.js`;
		module = await import(module);
		await module.build(config, handlebars)
	}

	console.log('rebuild:', (Date.now() - t) + 'ms')
}
