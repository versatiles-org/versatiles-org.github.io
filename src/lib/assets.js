
import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

export function build(config) {
	cpSync(
		resolve(config.srcPath, 'assets'),
		resolve(config.dstPath, 'assets'),
		{ recursive: true }
	)
}
