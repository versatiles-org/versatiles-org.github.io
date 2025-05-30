import { beforeEach, describe, it } from '@std/testing/bdd';
import { MenuEntry, Page } from './page.ts';
import { expect } from '@std/expect/expect';

const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
	<title>Original Title</title>
</head>
<body>
	<nav><ul><li>Old</li></ul></nav>
	<main>Old Content</main>
	<footer></footer>
</body>
</html>
`;

describe('Page', () => {
	let page: Page;

	beforeEach(() => {
		page = new Page(baseTemplate);
	});

	it('setTitle sets the document title', () => {
		page.setTitle('New Title');
		const html = page.render();
		expect(html).toContain('<title>New Title</title>');
	});

	it('setTitle throws if not a string', () => {
		// @ts-expect-error: Testing type error
		expect(() => page.setTitle(123)).toThrow(TypeError);
	});

	it('setContent sets the main content', () => {
		page.setContent('<h1>Hello</h1>');
		const html = page.render();
		expect(html).toContain('<main><h1>Hello</h1></main>');
	});

	it('setContent throws if not a string', () => {
		// @ts-expect-error: Testing type error
		expect(() => page.setContent({})).toThrow(TypeError);
	});

	it('addHead appends to the head', () => {
		page.addHead('<meta name="test" content="1">');
		const html = page.render();
		expect(html).toContain('<meta name="test" content="1">');
	});

	it('addHead throws if not a string', () => {
		// @ts-expect-error: Testing type error
		expect(() => page.addHead(42)).toThrow(TypeError);
	});

	it('setMenu replaces menu entries and adds github icon', () => {
		const entries: MenuEntry[] = [
			{ title: 'Home', url: '/' },
			{ title: 'Docs', url: '/docs' },
		];
		page.setMenu(entries);
		const html = page.render();
		expect(html).toBe([
			'<!DOCTYPE html><html><head>',
			'\t<title>Original Title</title>',
			'</head>',
			'<body>',
			'\t<nav><ul><li><a href="/">Home</a></li><li><a href="/docs">Docs</a></li><li class="github-icon"><a href="https://github.com/versatiles-org/"></a></li></ul></nav>',
			'\t<main>Old Content</main>',
			'\t<footer></footer>',
			'',
			'',
			'</body></html>',
		].join('\n'));
	});

	it('setGithubLink adds a github link to the footer', () => {
		page.setGithubLink('https://github.com/test/repo');
		const html = page.render();
		expect(html).toContain(
			'<div id="github-link"><a target="_blank" href="https://github.com/test/repo">Improve this page on GitHub</a></div>',
		);
	});

	it('setGithubLink removes previous github link', () => {
		page.setGithubLink('https://github.com/first');
		page.setGithubLink('https://github.com/second');
		const html = page.render();
		expect(html).toContain('https://github.com/second');
		expect(html).not.toContain('https://github.com/first');
	});

	it('setGithubLink throws if not a string', () => {
		// @ts-expect-error: Testing type error
		expect(() => page.setGithubLink(null)).toThrow(TypeError);
	});

	it('render returns the HTML string', () => {
		const html = page.render();
		expect(typeof html).toBe('string');
		expect(html).toContain('<!DOCTYPE html>');
	});

	it('setMenu highlights the selected menu entry', () => {
		const entries: MenuEntry[] = [
			{ title: 'Home', url: '/' },
			{ title: 'Docs', url: '/docs' },
		];
		page.setMenu(entries, 'Docs');
		const html = page.render();
		expect(html).toContain('<li><a href="/">Home</a></li>');
		expect(html).toContain('<li class="selected"><a href="/docs">Docs</a></li>');
	});

	it('setBaseUrl upgrades href and src attributes to absolute URLs', () => {
		const template = `
		<!DOCTYPE html>
		<html>
		<head></head>
		<body>
			<a href="http://example.com/page">Link</a>
			<img src="https://example.com/image.png">
			<img src="./relative.png">
			<a href="/absolute">absolute</a>
		</body>
		</html>
		`;
		const html = new Page(template).setBaseUrl('https://baseurl.com/path/').render();
		expect(html).toContain('href="http://example.com/page"');
		expect(html).toContain('src="https://example.com/image.png"');
		expect(html).toContain('src="https://baseurl.com/path/relative.png"');
		expect(html).toContain('href="https://baseurl.com/absolute"');
	});

	it('setBaseUrl throws if baseUrl is not a string', () => {
		// @ts-expect-error: Testing type error
		expect(() => page.setBaseUrl(123)).toThrow(TypeError);
	});
});
