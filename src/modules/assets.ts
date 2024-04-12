import { cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { AbstractModule } from './module.ts';

export default class Assets extends AbstractModule {
	async build() {
		cpSync(
			resolve(this.context.srcPath, 'assets'),
			resolve(this.context.dstPath, 'assets'),
			{ recursive: true }
		)
	}
}
