import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reportsDirectory: 'coverage',
			reporter: ['text', 'lcov'],
			include: ['src/**/*.ts'],
			// `dynamic.test.ts` compiles throwaway .page.ts modules into a temp
			// directory and imports them; they are fixtures, not source.
			exclude: ['**/*.test.ts', '**/*.page.ts'],
		},
	},
});
