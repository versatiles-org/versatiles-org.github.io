
import { cpSync } from 'node:fs';

export function copyAssets(config) {
	cpSync(
		config.src.assets,
		config.dst.assets,
		{ recursive: true }
	)
}
