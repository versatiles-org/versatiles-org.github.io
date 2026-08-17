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
	it('names both halves when both are present', () => {
		expect(renderIncomeSummary(summarizeIncome([entry('a', 30), oneTime('b', 180)])))
			.toBe(
				'VersaTiles currently receives **$30/month** from 1 recurring sponsor, ' +
					'plus **$180** from 1 one-time contribution.',
			);
	});

	it('omits the half that is empty and pluralises', () => {
		expect(renderIncomeSummary(summarizeIncome([oneTime('a', 20), oneTime('b', 5)])))
			.toBe('VersaTiles currently receives **$25** from 2 one-time contributions.');
	});

	it('returns an empty string when there is nothing to report', () => {
		expect(renderIncomeSummary(summarizeIncome([]))).toBe('');
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
