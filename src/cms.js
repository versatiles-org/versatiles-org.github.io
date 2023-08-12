
import Handlebars from 'handlebars';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = 8080;
const PROJECT_PATH = resolve(fileURLToPath(import.meta.url), '../../');

const CONFIG = {
	srcPath: resolve(PROJECT_PATH, 'docs'),
	dstPath: resolve(PROJECT_PATH, 'dist'),
}

process.chdir(CONFIG.srcPath);

if (existsSync(CONFIG.dstPath)) rmSync(CONFIG.dstPath, { recursive: true });
mkdirSync(CONFIG.dstPath);

let options = process.argv.slice(2).map(a => a.toLowerCase());

if (options.some(o => o.includes('serve'))) startServer();

await build();

if (options.some(o => o.includes('watch'))) {
	watch(
		CONFIG.srcPath,
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

	process.stderr.write((Date.now() - t) + 'ms ')
}

async function startServer() {
	const express = (await import('express')).default;
	const app = new express();
	app.use(express.static(CONFIG.dstPath))
	app.listen(PORT, () => console.log('start http://127.0.0.1:' + PORT));
}
