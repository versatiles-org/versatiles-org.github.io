import { cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { Configuration } from './config.ts';

export function build(config: Configuration) {
	cpSync(
		resolve(config.srcPath, 'assets'),
		resolve(config.dstPath, 'assets'),
		{ recursive: true }
	)
}
