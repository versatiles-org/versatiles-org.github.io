import type { PageResult } from './types.ts';

/**
 * Builds a dynamic page by importing and executing a .page.ts module.
 *
 * The module must export a default async function that returns a PageResult.
 *
 * @param filePath - Absolute path to the .page.ts file
 * @returns The PageResult from the dynamic page generator
 * @throws {Error} If the module has no default export or returns invalid data
 *
 * @example
 * ```ts
 * const result = await buildDynamicPage('/path/to/docs/releases.page.ts');
 * console.log(result.title, result.html);
 * ```
 */
export async function buildDynamicPage(filePath: string): Promise<PageResult> {
	const module = await import(filePath);

	if (typeof module.default !== 'function') {
		throw new Error(
			`Dynamic page "${filePath}" must export a default function`,
		);
	}

	const result = await module.default();

	if (!isValidPageResult(result)) {
		throw new Error(
			`Dynamic page "${filePath}" must return a valid PageResult with title, description, menuEntry, and html`,
		);
	}

	return result;
}

/**
 * Type guard to validate that a value is a valid PageResult.
 */
function isValidPageResult(value: unknown): value is PageResult {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.title === 'string' &&
		typeof obj.description === 'string' &&
		typeof obj.menuEntry === 'string' &&
		typeof obj.html === 'string'
	);
}
