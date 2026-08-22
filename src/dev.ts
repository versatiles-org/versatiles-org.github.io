import { createServer, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { config } from './config.ts';

import './build.ts';

const fsRoot = fileURLToPath(new URL(`../${config.distDir}/`, import.meta.url));

// `dev: true` re-stats the filesystem on every request and drops caching
// headers, so a rebuild shows up on the next reload rather than being served
// from a listing captured at startup.
const serve = sirv(fsRoot, { dev: true });

createServer((req, res) => {
	if (req.method !== 'GET') return ignore(res);
	if (/\.icp$/.test(req.url ?? '')) return ignore(res);

	serve(req, res, () => ignore(res));
}).listen(config.devServerPort, () => {
	console.log(`Serving ${config.distDir} on http://localhost:${config.devServerPort}/`);
});

function ignore(res: ServerResponse) {
	res.statusCode = 404;
	res.end('ignore');
}
