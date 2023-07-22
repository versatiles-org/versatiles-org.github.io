
import Handlebars from 'handlebars';
import * as Path from 'node:path';
import { rmdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = Path.dirname(fileURLToPath(import.meta.url));
const resolve = path => Path.resolve(__dirname, '../', path)

const config = {
	dir: {
		dist: resolve('dist'),
		docs: resolve('docs'),
		pages: resolve('docs/pages'),
		assets: resolve('docs/assets'),
		graphics: resolve('docs/graphics'),
		partials: resolve('docs/partials'),
	},
	url: {
		assets: 'assets',
	}
}

await build()

async function build() {
	let handlebars = Handlebars.create();
	rmdirSync(config.dir.dist, { recursive: true });
	(await import('./lib/assets.js')).copyAssets(config);
	(await import('./lib/helpers.js')).installHelpers(config, handlebars);
	(await import('./lib/partials.js')).installPartials(config, handlebars);
	(await import('./lib/pages.js')).processPages(config, handlebars);
}
