import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildDynamicPage } from './dynamic.ts';

describe('buildDynamicPage', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'dynamic_test_'));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true });
	});

	it('successfully generates page from valid .page.ts file', async () => {
		const filePath = join(tempDir, 'test.page.ts');
		writeFileSync(
			filePath,
			`export default async function() {
				return {
					title: 'Test Title',
					description: 'Test Description',
					menuEntry: 'Overview',
					html: '<h1>Test Content</h1>',
				};
			}`,
		);

		const result = await buildDynamicPage(filePath);

		expect(result.title).toBe('Test Title');
		expect(result.description).toBe('Test Description');
		expect(result.menuEntry).toBe('Overview');
		expect(result.html).toBe('<h1>Test Content</h1>');
	});

	it('includes optional githubLink when provided', async () => {
		const filePath = join(tempDir, 'with-github.page.ts');
		writeFileSync(
			filePath,
			`export default async function() {
				return {
					title: 'Title',
					description: 'Desc',
					menuEntry: 'Menu',
					html: '<p>Content</p>',
					githubLink: 'https://github.com/custom/link',
				};
			}`,
		);

		const result = await buildDynamicPage(filePath);

		expect(result.githubLink).toBe('https://github.com/custom/link');
	});

	it('throws error when module has no default export', async () => {
		const filePath = join(tempDir, 'no-default.page.ts');
		writeFileSync(
			filePath,
			`export function notDefault() {
				return { title: 'T', description: 'D', menuEntry: 'M', html: '' };
			}`,
		);

		await expect(buildDynamicPage(filePath)).rejects.toThrow(
			'must export a default function',
		);
	});

	it('throws error when default export is not a function', async () => {
		const filePath = join(tempDir, 'not-function.page.ts');
		writeFileSync(
			filePath,
			`export default { title: 'T', description: 'D', menuEntry: 'M', html: '' };`,
		);

		await expect(buildDynamicPage(filePath)).rejects.toThrow(
			'must export a default function',
		);
	});

	it('throws error when return value is missing required fields', async () => {
		const filePath = join(tempDir, 'missing-fields.page.ts');
		writeFileSync(
			filePath,
			`export default async function() {
				return { title: 'Only Title' };
			}`,
		);

		await expect(buildDynamicPage(filePath)).rejects.toThrow(
			'must return a valid PageResult',
		);
	});

	it('throws error when return value has wrong field types', async () => {
		const filePath = join(tempDir, 'wrong-types.page.ts');
		writeFileSync(
			filePath,
			`export default async function() {
				return {
					title: 123,
					description: 'Desc',
					menuEntry: 'Menu',
					html: '<p>Content</p>',
				};
			}`,
		);

		await expect(buildDynamicPage(filePath)).rejects.toThrow(
			'must return a valid PageResult',
		);
	});

	it('throws error when function returns null', async () => {
		const filePath = join(tempDir, 'returns-null.page.ts');
		writeFileSync(
			filePath,
			`export default async function() {
				return null;
			}`,
		);

		await expect(buildDynamicPage(filePath)).rejects.toThrow(
			'must return a valid PageResult',
		);
	});
});
