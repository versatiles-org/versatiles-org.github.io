import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { parseMarkdown } from '../cms/markdown.ts';
import {
	groupByTier,
	renderIncomeSummary,
	renderSponsorList,
	renderSponsorsListFile,
	renderSponsorsPage,
	renderTierSections,
	SPONSOR_TIERS,
	type SponsorEntry,
	summarizeIncome,
} from './render.ts';

const entry = (name: string, monthlyDollars: number, link = ''): SponsorEntry => ({
	name,
	link,
	monthlyDollars,
});

const oneTime = (name: string, monthlyDollars: number): SponsorEntry => ({
	name,
	link: '',
	monthlyDollars,
	isOneTime: true,
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

describe('summarizeIncome', () => {
	it('keeps recurring pledges and one-time money apart', () => {
		// The live figures as of 2026-08: a naive sum over monthlyDollars would
		// report $210/month, seven times the real recurring income.
		const income = summarizeIncome([
			oneTime('mapforge.org', 25),
			oneTime('Roman Plessl', 50),
			entry('Julius Lisauskas', 5),
			oneTime('Guido Gallenkamp', 100),
			oneTime('Guest', 5),
			entry('simon-jonathan', 25),
		]);
		expect(income).toEqual({
			recurringMonthlyDollars: 30,
			recurringCount: 2,
			oneTimeDollars: 180,
			oneTimeCount: 4,
		});
	});

	it('treats a missing isOneTime flag as recurring', () => {
		expect(summarizeIncome([entry('Acme', 25)].map((e) => ({ ...e, isOneTime: undefined }))))
			.toMatchObject({ recurringMonthlyDollars: 25, oneTimeDollars: 0 });
	});

	it('drops non-positive amounts, like the tier lists do', () => {
		const income = summarizeIncome([
			entry('past', -1),
			entry('zero', 0),
			oneTime('expired', -1),
			entry('live', 10),
		]);
		expect(income).toEqual({
			recurringMonthlyDollars: 10,
			recurringCount: 1,
			oneTimeDollars: 0,
			oneTimeCount: 0,
		});
	});

	it('reports zeroes for an empty list', () => {
		expect(summarizeIncome([])).toEqual({
			recurringMonthlyDollars: 0,
			recurringCount: 0,
			oneTimeDollars: 0,
			oneTimeCount: 0,
		});
	});
});

describe('renderIncomeSummary', () => {
	it('measures recurring income against the goal and reports one-time money separately', () => {
		expect(renderIncomeSummary(summarizeIncome([entry('a', 30), oneTime('b', 180)]), 500))
			.toBe(
				'VersaTiles currently receives **$30/month** from 1 recurring sponsor — ' +
					'**6%** of our **$500/month** goal. ' +
					'Another **$180** arrived as 1 one-time contribution.',
			);
	});

	it('never counts one-time money towards the goal', () => {
		// $1000 of one-time gifts must not read as 200% of a $500/month goal.
		const md = renderIncomeSummary(summarizeIncome([oneTime('whale', 1000)]), 500);
		expect(md).toContain('no recurring sponsors yet');
		expect(md).toContain('Another **$1000** arrived as 1 one-time contribution.');
		expect(md).not.toContain('%');
	});

	it('pluralises both counts', () => {
		expect(renderIncomeSummary(summarizeIncome([entry('a', 250), entry('b', 250)]), 500))
			.toBe(
				'VersaTiles currently receives **$500/month** from 2 recurring sponsors — ' +
					'**100%** of our **$500/month** goal.',
			);
	});

	it('drops the goal clause when no goal is set', () => {
		expect(renderIncomeSummary(summarizeIncome([entry('a', 30)]), 0))
			.toBe('VersaTiles currently receives **$30/month** from 1 recurring sponsor.');
	});

	it('returns an empty string when there is nothing at all to report', () => {
		expect(renderIncomeSummary(summarizeIncome([]), 0)).toBe('');
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
		expect(md).toBe('## Partner\n\n- [Big](https://big.test)\n\n## Supporter\n\n- Small');
	});

	it('accepts a deeper heading level', () => {
		expect(renderTierSections([entry('Big', 500)], SPONSOR_TIERS, 3))
			.toBe('### Partner\n\n- Big');
	});

	it('keeps one-time givers out of the tiers, in their own section by amount', () => {
		const md = renderTierSections(
			[oneTime('Gift', 100), entry('Pledge', 25), oneTime('Small gift', 5)],
			SPONSOR_TIERS,
		);
		// The $100 gift must not outrank the standing $25/month pledge.
		expect(md).toBe(
			'## Backer\n\n- Pledge\n\n## One-time contributions\n\n- Gift\n- Small gift',
		);
	});

	it('omits the one-time section when there is none', () => {
		expect(renderTierSections([entry('Pledge', 25)], SPONSOR_TIERS))
			.not.toContain('One-time');
	});

	it('falls back to an empty-state line when there are no sponsors', () => {
		expect(renderTierSections([], SPONSOR_TIERS)).toContain('No sponsors yet');
	});

	it('falls back to the empty state when every sponsor has expired', () => {
		expect(renderTierSections([entry('past', -1), oneTime('gone', -1)], SPONSOR_TIERS))
			.toContain('No sponsors yet');
	});
});

describe('renderSponsorsPage', () => {
	it('produces a page the CMS can parse, with the required front matter', () => {
		const page = renderSponsorsPage([entry('Acme', 100, 'https://acme.test')]);
		const { attrs, html } = parseMarkdown(page);
		expect(attrs.title).toBe('VersaTiles - Sponsors');
		expect(attrs.menuEntry).toBe('Sponsors');
		expect(typeof attrs.description).toBe('string');
		// Leaves the placeholder the CMS swaps the inlined SVG into, and lists
		// the sponsor under its tier.
		expect(html).toContain('<!-- sponsors-svg -->');
		expect(html).not.toContain('<img'); // inlined, never embedded
		expect(html).toContain('Acme');
		expect(html).toContain('<h2>Sponsor</h2>'); // tier heading, no h1 -> h3 gap
		expect(html).toContain('$100/month'); // income summary
	});

	it('can report income wider than the names it lists', () => {
		// Private sponsors are counted but never named, so the headline figure
		// must be able to exceed the sum of the listed sponsors.
		const { html } = parseMarkdown(renderSponsorsPage(
			[entry('Public', 25)],
			SPONSOR_TIERS,
			summarizeIncome([entry('Public', 25), entry('Private', 75)]),
		));
		expect(html).toContain('$100/month');
		expect(html).toContain('2 recurring sponsors');
		expect(html).not.toContain('Private');
	});

	it('separates one-time givers from tiered sponsors on the page', () => {
		const { html } = parseMarkdown(renderSponsorsPage([
			entry('Pledger', 25),
			{ name: 'Gifter', link: '', monthlyDollars: 100, isOneTime: true },
		]));
		expect(html).toContain('<h2>Backer</h2>');
		expect(html).toContain('<h2>One-time contributions</h2>');
		// $25/month recurring is the only income measured against the goal.
		expect(html).toContain('$25/month');
		expect(html).toContain('Another <strong>$100</strong>');
	});

	it('renders a valid page even with zero sponsors (bootstrap state)', () => {
		const { html } = parseMarkdown(renderSponsorsPage([]));
		expect(html).toContain('No sponsors yet');
	});
});

describe('renderSponsorsListFile', () => {
	it('produces the plain name list with a heading and tiered names', () => {
		const md = renderSponsorsListFile([entry('Acme', 500, 'https://acme.test')]);
		expect(md.startsWith('# Sponsors')).toBe(true);
		expect(md).toContain('## Partner');
		expect(md).toContain('[Acme](https://acme.test)');
	});
});
