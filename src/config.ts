import type { MenuEntry } from 'cheerio_cms';

/**
 * Central configuration for the VersaTiles.org static site generator.
 */

export const config: {
	githubOrg: string;
	githubRepo: string;
	githubBranch: string;
	docsDir: string;
	distDir: string;
	devServerPort: number;
	menu: MenuEntry[];
	assetExtensions: RegExp;
} = {
	/** GitHub organization URL */
	githubOrg: 'https://github.com/versatiles-org/',

	/** Repository for the main website (used for "Edit on GitHub" links) */
	githubRepo: 'https://github.com/versatiles-org/versatiles-org.github.io',

	/** Branch name for GitHub edit links */
	githubBranch: 'main',

	/** Source directory for documentation/content */
	docsDir: 'docs',

	/** Output directory for built site */
	distDir: 'dist',

	/** Development server port */
	devServerPort: 8080,

	/** Main navigation menu entries */
	menu: [
		{ title: 'Overview', url: 'https://versatiles.org/' },
		{ title: 'Playground', url: 'https://versatiles.org/playground/' },
		{ title: 'Tools', url: 'https://versatiles.org/tools/' },
		{ title: 'Documentation', url: 'https://docs.versatiles.org/' },
	],

	/** File extensions for assets to copy */
	assetExtensions: /\.(png|jpg|jpeg|gif|svg|webp|ico?)$/i,
};
