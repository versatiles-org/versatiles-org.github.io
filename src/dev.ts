import { serveDir } from '@std/http/file-server';
import { config } from './config.ts';

import './build.ts';

const fsRoot = (new URL(`../${config.distDir}`, import.meta.url)).pathname;

Deno.serve({ port: config.devServerPort }, (req: Request) => {
	if (req.method !== 'GET') return ignore();
	if (/\.icp$/.test(req.url)) return ignore();

	return serveDir(req, { fsRoot, urlRoot: '', quiet: true });

	function ignore() {
		return new Response('ignore', { status: 404 });
	}
});
