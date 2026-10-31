import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// `biome ci` only logs a stale schema version and still exits 0. `npm run upgrade`
// keeps it in sync, but Dependabot can't run `biome migrate`, so its PRs fail here.
it('biome.jsonc $schema matches the installed Biome version', () => {
	const { version } = JSON.parse(
		readFileSync('node_modules/@biomejs/biome/package.json', 'utf8'),
	) as { version: string };
	const schemaVersion = readFileSync('biome.jsonc', 'utf8').match(
		/biomejs\.dev\/schemas\/([^/]+)\/schema\.json/,
	)?.[1];

	expect(schemaVersion, 'run `npx biome migrate --write`').toBe(version);
});
