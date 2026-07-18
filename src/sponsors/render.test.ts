import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { parseMarkdown } from '../cms/markdown.ts';
import {
	groupByTier,
	renderSponsorList,
	renderSponsorsListFile,
	renderSponsorsPage,
	renderTierSections,
	SPONSOR_TIERS,
	type SponsorEntry,
} from './render.ts';

const entry = (name: string, monthlyDollars: number, link = ''): SponsorEntry => ({
	name,
	link,
	monthlyDollars,
});

describe('groupByTier', () => {
	it('returns tiers highest-first regardless of input order', () => {
		const groups = groupByTier([], SPONSOR_TIERS);
		expect(groups.map((g) => g.tier.title)).toEqual([
			'Partner',
			'Sponsor',
			'Backer',
			'Supporter',
		]);
	});

	it('places each sponsor in the highest tier they meet', () => {
		const sponsors = [
			entry('base', 5),
			entry('edge-backer', 25),
			entry('just-under-sponsor', 99),
			entry('sponsor', 100),
			entry('partner', 500),
			entry('whale', 5000),
		];
		const byTitle = Object.fromEntries(
			groupByTier(sponsors, SPONSOR_TIERS).map((
				g,
			) => [g.tier.title, g.sponsors.map((s) => s.name)]),
		);
		expect(byTitle.Supporter).toEqual(['base']);
		expect(byTitle.Backer).toEqual(['edge-backer', 'just-under-sponsor']);
		expect(byTitle.Sponsor).toEqual(['sponsor']);
		expect(byTitle.Partner).toEqual(['partner', 'whale']);
	});

	it('drops non-positive amounts (past / expired sponsors)', () => {
		const groups = groupByTier(
			[entry('past', -1), entry('zero', 0), entry('live', 10)],
			SPONSOR_TIERS,
		);
		const all = groups.flatMap((g) => g.sponsors.map((s) => s.name));
		expect(all).toEqual(['live']);
	});
});

describe('renderSponsorList', () => {
	it('links names when a link is present, plain otherwise', () => {
		expect(renderSponsorList([entry('Acme', 25, 'https://acme.test'), entry('Nobody', 5)]))
			.toBe('- [Acme](https://acme.test)\n- Nobody');
	});
});

describe('renderTierSections', () => {
	it('emits only non-empty tiers, highest first', () => {
		const md = renderTierSections(
			[entry('Big', 500, 'https://big.test'), entry('Small', 5)],
			SPONSOR_TIERS,
		);
		expect(md).toBe('### Partner\n\n- [Big](https://big.test)\n\n### Supporter\n\n- Small');
	});

	it('falls back to an empty-state line when there are no sponsors', () => {
		expect(renderTierSections([], SPONSOR_TIERS)).toContain('No sponsors yet');
	});
});

describe('renderSponsorsPage', () => {
	it('produces a page the CMS can parse, with the required front matter', () => {
		const page = renderSponsorsPage([entry('Acme', 100, 'https://acme.test')]);
		const { attrs, html } = parseMarkdown(page);
		expect(attrs.title).toBe('VersaTiles - Sponsors');
		expect(attrs.menuEntry).toBe('Sponsors');
		expect(typeof attrs.description).toBe('string');
		// Embeds the generated SVG and lists the sponsor under its tier.
		expect(html).toContain('/sponsors/sponsors.svg');
		expect(html).toContain('Acme');
		expect(html).toContain('Sponsor'); // tier heading
	});

	it('renders a valid page even with zero sponsors (bootstrap state)', () => {
		const { html } = parseMarkdown(renderSponsorsPage([]));
		expect(html).toContain('No sponsors yet');
	});
});

describe('renderSponsorsListFile', () => {
	it('produces the root SPONSORS.md with a heading and tiered names', () => {
		const md = renderSponsorsListFile([entry('Acme', 500, 'https://acme.test')]);
		expect(md.startsWith('# Sponsors')).toBe(true);
		expect(md).toContain('### Partner');
		expect(md).toContain('[Acme](https://acme.test)');
	});
});
