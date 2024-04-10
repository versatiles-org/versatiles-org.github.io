export interface Configuration { srcPath: string; dstPath: string }

import { resolve } from 'node:path';

const PROJECT_PATH = new URL('../../', import.meta.url).pathname;

const CONFIG: Configuration = {
	srcPath: resolve(PROJECT_PATH, 'docs'),
	dstPath: resolve(PROJECT_PATH, 'dist'),
}

export default CONFIG;
