/**
 * Pure presentation helpers for the generated sponsor lists.
 *
 * This module is intentionally free of any `sponsorkit` import, so the Markdown
 * generation can be unit-tested under Deno without SponsorKit's native
 * dependencies (sharp/resvg). The root `sponsor.config.ts` adapts SponsorKit's
 * fetched data into these types and writes the output in its `onSponsorsReady`
 * hook.
 *
 * The tier bucketing here mirrors SponsorKit's own `partitionTiers`, so the
 * name lists always match the rendered SVG/PNG: every sponsor lands in the
 * highest tier whose monthly threshold they meet, and non-positive amounts
 * (e.g. past/expired sponsors) are dropped.
 */

/** A tier bucket: sponsors at `minMonthlyDollars` and above (until the next tier). */
export interface SponsorTier {
	/** Display label, also used as the bold lead-in on the tier's line. */
	title: string;
	/** Inclusive lower bound in USD/month. The catch-all base tier uses 0. */
	minMonthlyDollars: number;
}

/** The minimal sponsor shape the name lists need. */
export interface SponsorEntry {
	/** Display name (falls back to the login handle upstream). */
	name: string;
	/** Best link for the sponsor, or an empty string for none. */
	link: string;
	/** Effective monthly amount in USD. */
	monthlyDollars: number;
	/**
	 * True for a single contribution rather than a recurring pledge. Upstream
	 * still reports these in `monthlyDollars`, so anything summing amounts as
	 * income must check this flag — see {@link summarizeIncome}.
	 */
	isOneTime?: boolean;
}

/**
 * The parts of a provider sponsorship this module reads.
 *
 * Structurally compatible with SponsorKit's `Sponsorship`, but declared here so
 * the adapter below can be unit-tested — and reused by the dev fixture script —
 * without importing SponsorKit's native dependencies.
 */
export interface RawSponsorship {
	sponsor: { login?: string; name?: string; websiteUrl?: string; linkUrl?: string };
	monthlyDollars: number;
	isOneTime?: boolean;
	privacyLevel?: string;
}

/**
 * Whether a sponsorship is still live.
 *
 * `includePastSponsors` pulls expired records (`monthlyDollars: -1`) into the
 * fetch so `prorateOnetime` can decay one-time gifts, but they must never reach
 * a renderer: SponsorKit's `partitionTiers` has no bucket for a negative amount
 * and falls back to the *first* tier, so a long-lapsed $5 sponsor would be
 * drawn as a Partner at XL size.
 */
export function isActive(s: RawSponsorship): boolean {
	return s.monthlyDollars > 0;
}

/**
 * Whether a sponsor consented to being named.
 *
 * SponsorKit strips private sponsors from the SVG/PNG/JSON, but only after
 * `onSponsorsReady` has run — so without this the Markdown lists someone who
 * asked not to be shown. Their money still counts towards the income totals: an
 * aggregate reveals no identity, and excluding it would understate what the
 * project receives.
 */
export function isNameable(s: RawSponsorship): boolean {
	return s.privacyLevel !== 'PRIVATE';
}

/** Adapt a provider sponsorship into the minimal shape the name lists need. */
export function toSponsorEntry(s: RawSponsorship): SponsorEntry {
	const { login, name, websiteUrl, linkUrl } = s.sponsor;
	return {
		name: name || login || '',
		link: linkUrl || websiteUrl || (login ? `https://github.com/${login}` : ''),
		monthlyDollars: s.monthlyDollars,
		// SponsorKit reports one-time gifts in `monthlyDollars` too, so the income
		// summary needs this flag to avoid counting them as recurring.
		isOneTime: s.isOneTime ?? false,
	};
}

/** A tier paired with the sponsors that fell into it. */
export interface SponsorTierGroup {
	tier: SponsorTier;
	sponsors: SponsorEntry[];
}

/**
 * Canonical tier definitions — the single source of truth shared by
 * `sponsor.config.ts` (which pairs each with a render preset). Higher tiers use
 * larger logos in the image, fulfilling the "prominent placement" promise.
 *
 * "Supporter" is the base tier (threshold 0), so every public sponsor — the
 * GitHub $5 entry tier and up — is listed.
 */
export const SPONSOR_TIERS: SponsorTier[] = [
	{ title: 'Supporter', minMonthlyDollars: 0 },
	{ title: 'Backer', minMonthlyDollars: 25 },
	{ title: 'Sponsor', minMonthlyDollars: 100 },
	{ title: 'Partner', minMonthlyDollars: 500 },
];

/**
 * `$1,500` — thousands separated, no cents. Only for amounts that vary with the
 * sponsor list; fixed figures are written out in the prose that mentions them.
 */
function usd(dollars: number): string {
	return `$${dollars.toLocaleString('en-US')}`;
}

/**
 * Label for the one-time givers, who sit outside the tiers. Exported because
 * `sponsor.config.ts` titles the matching section of the SVG with it — the
 * graphic and the text list should never disagree on the wording.
 */
export const ONE_TIME_TITLE = 'One-time contributions';

/**
 * Provider marks for the call-to-action buttons, sized by the `.icon` rule in
 * `docs/assets/style/sponsor.less`. `currentColor` so they follow the button
 * text, and `aria-hidden` because the adjacent label already names the target.
 */
const GITHUB_ICON =
	`<svg class="icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8Z"/></svg>`;

const OPEN_COLLECTIVE_ICON =
	`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M16.75 3.77a9.5 9.5 0 1 0 0 16.46"/><path d="M20.23 7.25a9.5 9.5 0 0 1 0 9.5"/></svg>`;

/** Sponsor call-to-action buttons, styled by `docs/assets/style/sponsor.less`. */
const SPONSOR_BUTTONS = `<div id="sponsor-buttons">
	<a class="sponsor-btn sponsor-btn--github" href="https://github.com/sponsors/versatiles-org" rel="noopener" target="_blank">${GITHUB_ICON}Sponsor on GitHub</a>
	<a class="sponsor-btn sponsor-btn--oc" href="https://opencollective.com/versatiles" rel="noopener" target="_blank">${OPEN_COLLECTIVE_ICON}Sponsor on Open Collective</a>
</div>`;

const GENERATED_NOTICE =
	'<sub>Generated automatically with [SponsorKit](https://github.com/antfu-collective/sponsorkit).</sub>';

const EMPTY_STATE =
	'_No sponsors yet — [become the first](https://github.com/sponsors/versatiles-org)!_';

/**
 * Bucket sponsors into tiers, highest tier first. Each sponsor lands in the
 * highest tier whose threshold they meet; non-positive amounts are dropped.
 */
export function groupByTier(sponsors: SponsorEntry[], tiers: SponsorTier[]): SponsorTierGroup[] {
	const groups: SponsorTierGroup[] = [...tiers]
		.sort((a, b) => b.minMonthlyDollars - a.minMonthlyDollars)
		.map((tier) => ({ tier, sponsors: [] as SponsorEntry[] }));

	for (const sponsor of sponsors) {
		if (sponsor.monthlyDollars <= 0) continue;
		const group = groups.find((g) => sponsor.monthlyDollars >= g.tier.minMonthlyDollars) ??
			groups[groups.length - 1];
		group.sponsors.push(sponsor);
	}

	return groups;
}

/**
 * Aggregate income figures derived from the sponsor list.
 *
 * Deliberately keeps recurring and one-time money apart: upstream reports both
 * in `monthlyDollars`, so a plain sum over that field badly overstates what
 * actually arrives every month.
 */
export interface SponsorIncome {
	/** Sum of the recurring pledges, USD/month — the only genuine per-month rate. */
	recurringMonthlyDollars: number;
	/** How many sponsors make up `recurringMonthlyDollars`. */
	recurringCount: number;
	/** Sum of the one-time contributions still listed, USD — a total, not a rate. */
	oneTimeDollars: number;
	/** How many sponsors make up `oneTimeDollars`. */
	oneTimeCount: number;
}

/**
 * Split the sponsor list into recurring monthly income and one-time money.
 *
 * Non-positive amounts (past / expired sponsors) are dropped, matching
 * {@link groupByTier}, so the figures always describe the sponsors on the page.
 *
 * Caveats worth remembering before quoting these numbers:
 *   - They are gross. Payment and fiscal-host fees are not deducted.
 *   - A sponsor merged across both providers has their amounts summed and
 *     counts as recurring unless *every* merged record was one-time, so a mixed
 *     sponsor inflates `recurringMonthlyDollars`.
 *   - `oneTimeDollars` covers only contributions still in the list, not
 *     everything ever received.
 */
export function summarizeIncome(sponsors: SponsorEntry[]): SponsorIncome {
	const income: SponsorIncome = {
		recurringMonthlyDollars: 0,
		recurringCount: 0,
		oneTimeDollars: 0,
		oneTimeCount: 0,
	};

	for (const sponsor of sponsors) {
		if (sponsor.monthlyDollars <= 0) continue;
		if (sponsor.isOneTime) {
			income.oneTimeDollars += sponsor.monthlyDollars;
			income.oneTimeCount++;
		} else {
			income.recurringMonthlyDollars += sponsor.monthlyDollars;
			income.recurringCount++;
		}
	}

	return income;
}

/** `1 sponsor` / `3 sponsors`. */
function plural(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Markdown summary of {@link summarizeIncome}, or an empty string when there is
 * nothing to report (so callers can drop the line entirely).
 *
 * Progress is shown against the nearest target still ahead, so the page reports
 * the next milestone rather than a discouraging fraction of the final one. Only
 * recurring income counts towards it — one-time money is not a monthly rate, so
 * folding it in would overstate what the project can rely on.
 *
 * The $500 and $1,500 figures also appear in the intro text of
 * {@link renderSponsorsPage}; change them in both places.
 */
export function renderIncomeSummary(income: SponsorIncome): string {
	const sentences: string[] = [];
	const recurring = income.recurringMonthlyDollars;
	const received = `VersaTiles currently receives **${usd(recurring)}/month** from ${
		plural(income.recurringCount, 'recurring sponsor')
	}`;

	if (recurring <= 0) {
		sentences.push(
			'VersaTiles has no recurring sponsors yet — help us reach the **$500/month** we need for server infrastructure.',
		);
	} else if (recurring < 500) {
		sentences.push(
			`${received} — **${
				Math.round(recurring / 500 * 100)
			}%** of the **$500/month** we need for server infrastructure.`,
		);
	} else if (recurring < 1500) {
		sentences.push(
			`${received} — **${
				Math.round(recurring / 1500 * 100)
			}%** of the **$1,500/month** we need for infrastructure and minimum maintenance.`,
		);
	} else {
		sentences.push(`${received}, covering infrastructure and maintenance — thank you!`);
	}

	if (income.oneTimeDollars > 0) {
		sentences.push(
			`Another **${usd(income.oneTimeDollars)}** arrived as ${
				plural(income.oneTimeCount, 'one-time contribution')
			}.`,
		);
	}

	return sentences.join(' ');
}

/** Render sponsors as one comma-separated run of linked names. */
export function renderSponsorLinks(sponsors: SponsorEntry[]): string {
	return sponsors
		.map((s) => (s.link ? `[${s.name}](${s.link})` : s.name))
		.join(', ');
}

/**
 * Render one line per non-empty tier, highest first, followed by a line of
 * one-time givers — each a bold title followed by the sponsors' names.
 *
 * A line per tier rather than a heading and a bullet list: with a handful of
 * names per tier the headings dominated the page, and the graphic above already
 * carries the visual weight.
 *
 * Only recurring sponsors are placed in tiers. The tiers are monthly rates, and
 * upstream reports a one-time gift in `monthlyDollars` as though it recurred —
 * so bucketing them together would rank a single $100 gift above a standing
 * $25/month pledge. One-time givers are listed by amount instead.
 */
export function renderTierLines(sponsors: SponsorEntry[], tiers: SponsorTier[]): string {
	const line = (title: string, group: SponsorEntry[]) =>
		`**${title}:** ${renderSponsorLinks(group)}`;

	const lines = groupByTier(sponsors.filter((s) => !s.isOneTime), tiers)
		.filter((g) => g.sponsors.length > 0)
		.map((g) => line(g.tier.title, g.sponsors));

	const oneTime = sponsors
		.filter((s) => s.isOneTime && s.monthlyDollars > 0)
		.sort((a, b) => b.monthlyDollars - a.monthlyDollars);
	if (oneTime.length > 0) lines.push(line(ONE_TIME_TITLE, oneTime));

	// Blank lines between: each tier becomes its own paragraph, rather than
	// Markdown running them all together into one.
	return lines.length > 0 ? lines.join('\n\n') : EMPTY_STATE;
}

/**
 * Build the full https://versatiles.org/sponsors/ page (with YAML front matter
 * so the CMS renders it with the site template).
 *
 * The `<!-- sponsors-svg -->` placeholder is swapped for the contents of the
 * generated `docs/sponsors/sponsors.svg` at build time. The graphic is inlined
 * rather than referenced with an `img` element so that the per-sponsor links
 * SponsorKit puts inside it are actually clickable — see `./inlineSvg.ts`.
 *
 * @param incomeOf Income figures for the headline sentence. Defaults to the
 * sponsors being listed, but the caller can pass a wider total — the site
 * counts private sponsors' money while leaving them unnamed.
 */
export function renderSponsorsPage(
	sponsors: SponsorEntry[],
	tiers = SPONSOR_TIERS,
	incomeOf = summarizeIncome(sponsors),
): string {
	const sections = renderTierLines(sponsors, tiers);
	const income = renderIncomeSummary(incomeOf);
	return `---
title: VersaTiles - Sponsors
description: The individuals and organizations who support VersaTiles.
menuEntry: Sponsors
githubLink: https://github.com/versatiles-org/versatiles-org.github.io/blob/main/sponsor.config.ts
---

# Sponsors

VersaTiles is free and self-hostable — but not free to run. Our server
infrastructure costs **$500/month**, and covering infrastructure and minimum
maintenance takes **$1,500/month** in all. Every contribution goes towards those
numbers.

${income}

${SPONSOR_BUTTONS}

<div class="sponsor-logos">
	<!-- sponsors-svg -->
</div>

${sections}

${GENERATED_NOTICE}
`;
}

/**
 * Build the plain sponsors name list (served verbatim as
 * `/sponsors/sponsors.txt`). Content is Markdown; the `.txt` extension just
 * keeps the CMS from rendering it to HTML.
 */
export function renderSponsorsListFile(sponsors: SponsorEntry[], tiers = SPONSOR_TIERS): string {
	const sections = renderTierLines(sponsors, tiers);
	return `# Sponsors

VersaTiles is free and open source. These wonderful people and organizations help
keep it maintained — **thank you!** 💚

Sponsor us on [GitHub](https://github.com/sponsors/versatiles-org) or
[Open Collective](https://opencollective.com/versatiles); every $5/month adds your
name to this list.

${sections}

---

${GENERATED_NOTICE}
`;
}
