import { cpSync } from 'node:fs';
import { resolve } from 'node:path';
import Context from '../lib/context.ts';

export async function build(context: Context) {
	cpSync(
		resolve(context.srcPath, 'assets'),
		resolve(context.dstPath, 'assets'),
		{ recursive: true }
	)
}
