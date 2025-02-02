
import express from 'express';
import { watch } from 'node:fs';
import CMS from './cms/index.ts';

const PORT = 8080;
const SRC_PATH = new URL('../docs', import.meta.url).pathname;
const DST_PATH = new URL('../dist', import.meta.url).pathname;

const options = process.argv.slice(2).map(a => a.toLowerCase());

if (options.some(o => o.includes('serve'))) startServer();

await getCMS().build();

if (options.some(o => o.includes('watch'))) {
	const cms = getCMS();
	watch(
		SRC_PATH,
		{ recursive: true },
		() => {
			void cms.build();
		},
	);
}

function getCMS(): { build: () => Promise<void> } {
	let running = false;
	let queued = false;

	const cms = new CMS(SRC_PATH, DST_PATH);

	return {
		build: async (): Promise<void> => {
			if (running) {
				queued = true;
				return;
			}
			do {
				queued = false;
				running = true;
				await build();
				running = false;
			 
			} while (queued);
		},
	};

	async function build(): Promise<void> {
		const t = Date.now();
		await cms.build();
		process.stderr.write((Date.now() - t) + 'ms ');
	}
}

function startServer(): void {
	const app = express();
	app.use(express.static(DST_PATH));
	app.listen(PORT, () => {
		console.log('start http://127.0.0.1:' + PORT);
	});
}
