
import Handlebars from 'handlebars';
import { existsSync, mkdirSync, rmSync, watch } from 'node:fs';
import CONFIG from './lib/config.ts';

const PORT = 8080;

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

	for (let moduleName of modules) {
		const module = await import(`./lib/${moduleName}.js`);
		await module.build(CONFIG, handlebars)
	}

	process.stderr.write((Date.now() - t) + 'ms ')
}

async function startServer() {
	const express = (await import('express')).default;
	const app = express();
	app.use(express.static(CONFIG.dstPath))
	app.listen(PORT, () => console.log('start http://127.0.0.1:' + PORT));
}
