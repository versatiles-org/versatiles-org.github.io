
import { existsSync, mkdirSync, rmSync, watch } from 'node:fs';
import Context from './lib/context.ts';

const PORT = 8080;
const SRC_PATH = new URL('../docs', import.meta.url).pathname;
const DST_PATH = new URL('../dist', import.meta.url).pathname;

let options = process.argv.slice(2).map(a => a.toLowerCase());

if (options.some(o => o.includes('serve'))) startServer();

await build();

if (options.some(o => o.includes('watch'))) {
	watch(
		SRC_PATH,
		{ recursive: true },
		(event, filename) => build()
	);
}

async function build() {
	let t = Date.now();

	const context = new Context(SRC_PATH, DST_PATH);

	if (existsSync(context.dstPath)) rmSync(context.dstPath, { recursive: true });
	mkdirSync(context.dstPath);

	await (await load('assets') as typeof import('./modules/assets.ts')).build(context);
	await (await load('helpers') as typeof import('./modules/helpers.ts')).build(context);
	await (await load('pages') as typeof import('./modules/pages.ts')).build(context);

	async function load(name: string) {
		return (await import(`./modules/${name}.ts${context.v}`));
	}

	process.stderr.write((Date.now() - t) + 'ms ')
}

async function startServer() {
	const express = (await import('express')).default;
	const app = express();
	app.use(express.static(DST_PATH))
	app.listen(PORT, () => console.log('start http://127.0.0.1:' + PORT));
}
