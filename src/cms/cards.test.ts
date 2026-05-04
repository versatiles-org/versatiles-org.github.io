import { join } from '@std/path/join';
import { renderCardsFromFile } from './cards.ts';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';

describe('renderCardsFromFile', () => {
	let dir: string;
	let path: string;

	beforeEach(() => {
		dir = Deno.makeTempDirSync({ prefix: 'cards_test_' });
		path = join(dir, 'cards.yaml');
	});

	afterEach(() => {
		Deno.removeSync(dir, { recursive: true });
	});

	const write = (yaml: string) => Deno.writeTextFileSync(path, yaml);

	it('renders sections, cards, and the stretched-link wrapper', () => {
		write(`
sections:
  - title: "🗺️ Live demos"
    cards:
      - title: "Tile server"
        hook: "Browse our public tile server."
        url: https://tiles.versatiles.org/
        image: assets/cards/tile-server.webp
        repo: https://github.com/versatiles-org/tiles.versatiles.org
`);
		// Create the referenced image so the renderer emits an <img> instead
		// of falling back to a placeholder.
		Deno.mkdirSync(join(dir, 'assets/cards'), { recursive: true });
		Deno.writeTextFileSync(join(dir, 'assets/cards/tile-server.webp'), '');

		const html = renderCardsFromFile(path, { imageBaseDir: dir });
		expect(html).toContain('<section class="cards-section">');
		expect(html).toContain('<h3>🗺️ Live demos</h3>');
		expect(html).toContain('<article class="card">');
		expect(html).toContain('src="/assets/cards/tile-server.webp"');
		expect(html).toContain('href="https://tiles.versatiles.org/"');
		expect(html).toContain(
			'<a class="card__repo" href="https://github.com/versatiles-org/tiles.versatiles.org"',
		);
	});

	it('falls back to a placeholder when the referenced image is missing', () => {
		write(`
sections:
  - title: "X"
    cards:
      - title: "Demo"
        hook: "Hook"
        url: https://example.com/
        image: assets/cards/missing.webp
`);
		const html = renderCardsFromFile(path, { imageBaseDir: dir });
		expect(html).toContain('card__thumb--placeholder');
		expect(html).not.toContain('<img class="card__thumb"');
	});

	it('renders inline markdown in titles and hooks', () => {
		write(`
sections:
  - title: "📦 Libraries"
    cards:
      - title: "Choropleth pipeline *(experimental)*"
        hook: "Read \`.versatiles\` files in the [browser](https://example.com)."
        url: https://github.com/versatiles-org/versatiles-choro
`);
		const html = renderCardsFromFile(path);
		expect(html).toContain('Choropleth pipeline <em>(experimental)</em>');
		expect(html).toContain('<code>.versatiles</code>');
		expect(html).toMatch(/<a href="https:\/\/example\.com"[^>]*>browser<\/a>/);
	});

	it('emits a placeholder thumbnail when image is omitted', () => {
		write(`
sections:
  - title: "Community"
    cards:
      - title: "Mastodon"
        hook: "Project updates."
        url: https://mastodon.social/@VersaTiles
`);
		const html = renderCardsFromFile(path);
		expect(html).toContain('card__thumb--placeholder');
		expect(html).not.toContain('<img class="card__thumb"');
	});

	it('omits the repo link when repo is unset', () => {
		write(`
sections:
  - title: "X"
    cards:
      - title: "A"
        hook: "B"
        url: https://example.com/
`);
		const html = renderCardsFromFile(path);
		expect(html).not.toContain('card__repo');
	});

	it('escapes URLs in href and aria-label attributes', () => {
		write(`
sections:
  - title: "X"
    cards:
      - title: "Demo"
        hook: "Hook"
        url: 'https://example.com/?a=1&b="2"'
        repo: 'https://example.com/repo?x="y"&z=1'
`);
		const html = renderCardsFromFile(path);
		expect(html).toContain('href="https://example.com/?a=1&amp;b=&quot;2&quot;"');
		expect(html).toContain('href="https://example.com/repo?x=&quot;y&quot;&amp;z=1"');
		expect(html).toContain('aria-label="Demo source on GitHub"');
	});

	it('throws when the file is missing', () => {
		expect(() => renderCardsFromFile(join(dir, 'nope.yaml'))).toThrow(
			'Failed to read cards file',
		);
	});

	it('throws when YAML is malformed', () => {
		write('sections: [oops: nope');
		expect(() => renderCardsFromFile(path)).toThrow('Failed to parse YAML');
	});

	it('throws when the root is not an object', () => {
		write('- not\n- an\n- object');
		expect(() => renderCardsFromFile(path)).toThrow('"sections" array');
	});

	it('throws on a card with missing required fields', () => {
		write(`
sections:
  - title: "X"
    cards:
      - title: "Missing hook and url"
`);
		expect(() => renderCardsFromFile(path)).toThrow('missing required string "hook"');
	});
});
