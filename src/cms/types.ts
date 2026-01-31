/**
 * Result interface for dynamic page generators (.page.ts files).
 *
 * Dynamic pages export an async function that returns this interface,
 * allowing programmatic HTML generation during the build process.
 *
 * @example
 * ```ts
 * // docs/releases.page.ts
 * export default async function(): Promise<PageResult> {
 *   return {
 *     title: 'Releases',
 *     description: 'Release history',
 *     menuEntry: 'Overview',
 *     html: '<h1>Releases</h1>',
 *   };
 * }
 * ```
 */
export interface PageResult {
	/** Page title for <title> tag and heading */
	title: string;
	/** Meta description for SEO */
	description: string;
	/** Menu item identifier for highlighting active navigation */
	menuEntry: string;
	/** Rendered HTML content for the page body */
	html: string;
	/** Optional custom GitHub edit link (auto-generated if not provided) */
	githubLink?: string;
}
