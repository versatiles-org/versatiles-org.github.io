
import { cpSync } from 'node:fs';

export function build(config) {
	cpSync(
		config.src.assets,
		config.dst.assets,
		{ recursive: true }
	)
}
