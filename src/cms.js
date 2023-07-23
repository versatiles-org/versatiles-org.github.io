
import Handlebars from 'handlebars';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = 8080;
const PROJECT_PATH = resolve(fileURLToPath(import.meta.url), '../../');

const CONFIG = {
	src: {
		root: resolve(PROJECT_PATH, 'docs'),
		pages: resolve(PROJECT_PATH, 'docs/pages'),
		assets: resolve(PROJECT_PATH, 'docs/assets'),
		graphics: resolve(PROJECT_PATH, 'docs/graphics'),
		helpers: resolve(PROJECT_PATH, 'docs/helpers'),
		partials: resolve(PROJECT_PATH, 'docs/partials'),
	},
	dst: {
		root: resolve(PROJECT_PATH, 'dist'),
		assets: resolve(PROJECT_PATH, 'dist/assets'),
	}
}

if (existsSync(CONFIG.dst.root)) rmSync(CONFIG.dst.root, { recursive: true });
mkdirSync(CONFIG.dst.root);

let options = process.argv.slice(2).map(a => a.toLowerCase());

if (options.some(o => o.includes('serve'))) startServer();

await build();

if (options.some(o => o.includes('watch'))) {
	watch(
		CONFIG.src.root,
		{ recursive: true },
		(event, filename) => build()
	);
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
		await module.build(CONFIG, handlebars)
	}

	console.log('rebuild:', (Date.now() - t) + 'ms')
}

async function startServer() {
	const express = (await import('express')).default;
	const app = new express();
	app.use(express.static(CONFIG.dst.root))
	app.listen(PORT, () => console.log('start http://127.0.0.1:' + PORT));
}
