import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { parseMarkdown } from '../cms/markdown.ts';
import {
	groupByTier,
	isActive,
	isNameable,
	renderIncomeSummary,
	renderSponsorLinks,
	renderSponsorsListFile,
	renderSponsorsPage,
	renderTierLines,
	SPONSOR_TIERS,
	type SponsorEntry,
	summarizeIncome,
	toSponsorEntry,
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
			'Sustainer',
			'Backer',
			'Supporter',
		]);
	});

	it('places each sponsor in the highest tier they meet', () => {
		const sponsors = [
			entry('base', 5),
			entry('edge-backer', 25),
			entry('just-under-sponsor', 99),
			entry('sustainer', 100),
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
		expect(byTitle.Sustainer).toEqual(['sustainer']);
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

describe('toSponsorEntry / isActive / isNameable', () => {
	it('prefers the display name and the sponsor’s own link', () => {
		expect(toSponsorEntry({
			sponsor: { login: 'acme', name: 'Acme Inc', linkUrl: 'https://acme.test' },
			monthlyDollars: 25,
		})).toEqual({
			name: 'Acme Inc',
			link: 'https://acme.test',
			monthlyDollars: 25,
			isOneTime: false,
			isAnonymous: false,
		});
	});

	it('leaves Open Collective guest profiles unlinked', () => {
		// opencollective.com/guest-fcdc0bca is an empty page, not a profile.
		expect(toSponsorEntry({
			sponsor: {
				login: 'guest-fcdc0bca',
				name: 'Guest',
				linkUrl: 'https://opencollective.com/guest-fcdc0bca',
			},
			monthlyDollars: 5,
		})).toMatchObject({ name: 'Guest', link: '' });

		expect(
			toSponsorEntry({
				sponsor: { login: 'incognito-38f4031f', name: 'Incognito' },
				monthlyDollars: 5,
			}).link,
		).toBe('');
	});

	it('still links real accounts whose name merely starts with guest', () => {
		expect(
			toSponsorEntry({
				sponsor: { login: 'guest-house', linkUrl: 'https://guest.test' },
				monthlyDollars: 5,
			}).link,
		).toBe('https://guest.test');
	});

	it('flags private sponsors as anonymous', () => {
		expect(
			toSponsorEntry({
				sponsor: { login: 'shy' },
				monthlyDollars: 5,
				privacyLevel: 'PRIVATE',
			}).isAnonymous,
		).toBe(true);
		expect(toSponsorEntry({ sponsor: { login: 'open' }, monthlyDollars: 5 }).isAnonymous)
			.toBe(false);
	});

	it('falls back to the login and a GitHub profile URL', () => {
		expect(toSponsorEntry({ sponsor: { login: 'ghost' }, monthlyDollars: 5 }))
			.toMatchObject({ name: 'ghost', link: 'https://github.com/ghost' });
	});

	it('prefers linkUrl over websiteUrl', () => {
		expect(
			toSponsorEntry({
				sponsor: { login: 'a', linkUrl: 'https://link.test', websiteUrl: 'https://site.test' },
				monthlyDollars: 5,
			}).link,
		).toBe('https://link.test');
	});

	it('carries the one-time flag through, defaulting to recurring', () => {
		expect(
			toSponsorEntry({ sponsor: { login: 'a' }, monthlyDollars: 5, isOneTime: true }).isOneTime,
		)
			.toBe(true);
		expect(toSponsorEntry({ sponsor: { login: 'a' }, monthlyDollars: 5 }).isOneTime).toBe(false);
	});

	it('treats expired records as inactive', () => {
		expect(isActive({ sponsor: { login: 'a' }, monthlyDollars: -1 })).toBe(false);
		expect(isActive({ sponsor: { login: 'a' }, monthlyDollars: 0 })).toBe(false);
		expect(isActive({ sponsor: { login: 'a' }, monthlyDollars: 1 })).toBe(true);
	});

	it('treats only PRIVATE sponsors as unnameable', () => {
		const s = { sponsor: { login: 'a' }, monthlyDollars: 5 };
		expect(isNameable({ ...s, privacyLevel: 'PRIVATE' })).toBe(false);
		expect(isNameable({ ...s, privacyLevel: 'PUBLIC' })).toBe(true);
		expect(isNameable(s)).toBe(true); // absent means public
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
	it('measures recurring income against the infrastructure target', () => {
		expect(renderIncomeSummary(summarizeIncome([entry('a', 30), oneTime('b', 180)])))
			.toBe(
				'VersaTiles currently receives **$30/month** from 1 recurring sponsor — ' +
					'**6%** of the **$500/month** we need for server infrastructure. ' +
					'Another **$180** arrived as 1 one-time contribution.',
			);
	});

	it('advances to the maintenance target once infrastructure is covered', () => {
		// Not "120% of $500" — the page should show the milestone still ahead.
		expect(renderIncomeSummary(summarizeIncome([entry('a', 600)])))
			.toBe(
				'VersaTiles currently receives **$600/month** from 1 recurring sponsor — ' +
					'**40%** of the **$1,500/month** we need for infrastructure and minimum maintenance.',
			);
	});

	it('stops quoting a percentage once both targets are met', () => {
		const md = renderIncomeSummary(summarizeIncome([entry('a', 1500)]));
		expect(md).toBe(
			'VersaTiles currently receives **$1,500/month** from 1 recurring sponsor, ' +
				'covering infrastructure and maintenance — thank you!',
		);
		expect(md).not.toContain('%');
	});

	it('never counts one-time money towards the target', () => {
		// $1,000 of one-time gifts must not read as 200% of the $500/month level.
		const md = renderIncomeSummary(summarizeIncome([oneTime('whale', 1000)]));
		expect(md).toContain('no recurring sponsors yet');
		expect(md).toContain('Another **$1,000** arrived as 1 one-time contribution.');
		expect(md).not.toContain('%');
	});

	it('asks for the first target when there is nothing at all', () => {
		expect(renderIncomeSummary(summarizeIncome([])))
			.toBe(
				'VersaTiles has no recurring sponsors yet — help us reach the **$500/month** ' +
					'we need for server infrastructure.',
			);
	});
});

describe('renderSponsorLinks', () => {
	it('joins names with commas, linking those that have a link', () => {
		expect(renderSponsorLinks([entry('Acme', 25, 'https://acme.test'), entry('Nobody', 5)]))
			.toBe('[Acme](https://acme.test), Nobody');
	});

	it('renders a single sponsor without a trailing comma', () => {
		expect(renderSponsorLinks([entry('Solo', 5)])).toBe('Solo');
	});
});

describe('renderTierLines', () => {
	it('emits one bold-led line per non-empty tier, highest first', () => {
		const md = renderTierLines(
			[entry('Big', 500, 'https://big.test'), entry('Small', 5), entry('Other', 5)],
			SPONSOR_TIERS,
		);
		expect(md).toBe(
			'**Partner:** [Big](https://big.test)\n\n**Supporter:** Small, Other',
		);
	});

	it('keeps one-time givers out of the tiers, on their own line by amount', () => {
		const md = renderTierLines(
			[oneTime('Gift', 100), entry('Pledge', 25), oneTime('Small gift', 5)],
			SPONSOR_TIERS,
		);
		// The $100 gift must not outrank the standing $25/month pledge.
		expect(md).toBe(
			'**Backer:** Pledge\n\n**One-time contributions:** Gift, Small gift',
		);
	});

	it('tallies anonymous sponsors instead of naming them', () => {
		const md = renderTierLines([
			entry('Public', 25),
			{ name: 'Secret Corp', link: 'https://secret.test', monthlyDollars: 5, isAnonymous: true },
		], SPONSOR_TIERS);
		expect(md).toBe(
			'**Backer:** Public\n\n**Anonymous:** 1 sponsor who asked not to be named',
		);
		expect(md).not.toContain('Secret Corp');
		expect(md).not.toContain('secret.test');
	});

	it('pluralises the anonymous tally and counts one-time givers too', () => {
		const md = renderTierLines([
			{ name: 'a', link: '', monthlyDollars: 5, isAnonymous: true },
			{ name: 'b', link: '', monthlyDollars: 100, isOneTime: true, isAnonymous: true },
		], SPONSOR_TIERS);
		expect(md).toBe('**Anonymous:** 2 sponsors who asked not to be named');
	});

	it('omits the anonymous line when everyone is named', () => {
		expect(renderTierLines([entry('Public', 25)], SPONSOR_TIERS)).not.toContain('Anonymous');
	});

	it('omits the one-time line when there is none', () => {
		expect(renderTierLines([entry('Pledge', 25)], SPONSOR_TIERS)).not.toContain('One-time');
	});

	it('falls back to an empty-state line when there are no sponsors', () => {
		expect(renderTierLines([], SPONSOR_TIERS)).toContain('No sponsors yet');
	});

	it('falls back to the empty state when every sponsor has expired', () => {
		expect(renderTierLines([entry('past', -1), oneTime('gone', -1)], SPONSOR_TIERS))
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
		expect(html).toContain('<strong>Sustainer:</strong>'); // tier line, not a heading
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
		expect(html).toContain('<strong>Backer:</strong>');
		expect(html).toContain('<strong>One-time contributions:</strong>');
		// $25/month recurring is the only income measured against the goal.
		expect(html).toContain('$25/month');
		expect(html).toContain('Another <strong>$100</strong>');
	});

	it('thanks the sponsors above the graphic', () => {
		const { html } = parseMarkdown(renderSponsorsPage([entry('Acme', 25)]));
		expect(html).toContain('thank you!');
		// Introduces the showcase rather than trailing it.
		expect(html.indexOf('thank you!')).toBeLessThan(html.indexOf('sponsors-svg'));
	});

	it('renders a valid page even with zero sponsors (bootstrap state)', () => {
		const { html } = parseMarkdown(renderSponsorsPage([]));
		expect(html).toContain('No sponsors yet');
		// Nobody to thank yet.
		expect(html).not.toContain('thank you!');
	});

	it('does not thank anyone when every sponsor has expired', () => {
		const { html } = parseMarkdown(renderSponsorsPage([entry('past', -1)]));
		expect(html).not.toContain('thank you!');
	});
});

describe('renderSponsorsListFile', () => {
	it('produces the plain name list with a heading and tiered names', () => {
		const md = renderSponsorsListFile([entry('Acme', 500, 'https://acme.test')]);
		expect(md.startsWith('# Sponsors')).toBe(true);
		expect(md).toContain('**Partner:**');
		expect(md).toContain('[Acme](https://acme.test)');
	});
});
