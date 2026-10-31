import { defineConfig } from 'vitest/config';

/**
 * The cross-browser tests. They need the built site and Playwright's browsers, so
 * they stay out of `npm test` and run through `npm run test:browsers`.
 */
export default defineConfig({
	test: {
		include: ['tests/browsers/**/*.test.ts'],
		testTimeout: 60_000,
	},
});
