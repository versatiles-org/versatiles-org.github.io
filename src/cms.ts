
import  express from 'express';
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

	new (await import('./modules/assets.ts')).default(context).build();
	new (await import('./modules/pages.ts')).default(context).build();

	process.stderr.write((Date.now() - t) + 'ms ')
}

async function startServer() {
	const app = express();
	app.use(express.static(DST_PATH))
	app.listen(PORT, () => console.log('start http://127.0.0.1:' + PORT));
}
