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
	/** Display label, also used as the Markdown section heading. */
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
 * Monthly funding target, USD.
 *
 * Dollars, not euros: every provider amount reaching {@link summarizeIncome} is
 * USD (GitHub reports `monthlyPriceInDollars`, and the Open Collective is
 * configured in USD), so a euro target here would be compared against dollar
 * income. See the currency note in `sponsor.config.ts`.
 */
export const MONTHLY_GOAL_DOLLARS = 500;

/** Heading for the flat list of one-time givers, who sit outside the tiers. */
const ONE_TIME_TITLE = 'One-time contributions';

/** Sponsor call-to-action buttons, styled by `docs/assets/style/sponsor.less`. */
const SPONSOR_BUTTONS = `<div id="sponsor-buttons">
	<a class="sponsor-btn sponsor-btn--github" href="https://github.com/sponsors/versatiles-org" rel="noopener" target="_blank">Sponsor on GitHub</a>
	<a class="sponsor-btn sponsor-btn--oc" href="https://opencollective.com/versatiles" rel="noopener" target="_blank">Sponsor on Open Collective</a>
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
 * no money to report (so callers can drop the line entirely).
 *
 * Only recurring income is measured against the goal — one-time money is not a
 * monthly rate, so folding it in would overstate progress.
 */
export function renderIncomeSummary(
	income: SponsorIncome,
	goalDollars = MONTHLY_GOAL_DOLLARS,
): string {
	const sentences: string[] = [];

	if (income.recurringMonthlyDollars > 0) {
		const progress = goalDollars > 0
			? ` — **${
				Math.round(income.recurringMonthlyDollars / goalDollars * 100)
			}%** of our **$${goalDollars}/month** goal`
			: '';
		sentences.push(
			`VersaTiles currently receives **$${income.recurringMonthlyDollars}/month** from ${
				plural(income.recurringCount, 'recurring sponsor')
			}${progress}.`,
		);
	} else if (goalDollars > 0) {
		sentences.push(
			`VersaTiles has no recurring sponsors yet — help us reach **$${goalDollars}/month**.`,
		);
	}

	if (income.oneTimeDollars > 0) {
		sentences.push(
			`Another **$${income.oneTimeDollars}** arrived as ${
				plural(income.oneTimeCount, 'one-time contribution')
			}.`,
		);
	}

	return sentences.join(' ');
}

/** Render one tier's sponsors as a Markdown bullet list of linked names. */
export function renderSponsorList(sponsors: SponsorEntry[]): string {
	return sponsors
		.map((s) => (s.link ? `- [${s.name}](${s.link})` : `- ${s.name}`))
		.join('\n');
}

/**
 * Render a heading per non-empty tier, highest first, followed by a flat
 * "One-time contributions" section.
 *
 * Only recurring sponsors are placed in tiers. The tiers are monthly rates, and
 * upstream reports a one-time gift in `monthlyDollars` as though it recurred —
 * so bucketing them together would rank a single $100 gift above a standing
 * $25/month pledge. One-time givers are listed by amount instead.
 *
 * @param headingLevel Markdown heading depth; the default `2` sits directly
 * under the `#` page title, leaving no gap for screen readers.
 */
export function renderTierSections(
	sponsors: SponsorEntry[],
	tiers: SponsorTier[],
	headingLevel = 2,
): string {
	const hashes = '#'.repeat(headingLevel);

	const sections = groupByTier(sponsors.filter((s) => !s.isOneTime), tiers)
		.filter((g) => g.sponsors.length > 0)
		.map((g) => `${hashes} ${g.tier.title}\n\n${renderSponsorList(g.sponsors)}`);

	const oneTime = sponsors
		.filter((s) => s.isOneTime && s.monthlyDollars > 0)
		.sort((a, b) => b.monthlyDollars - a.monthlyDollars);
	if (oneTime.length > 0) {
		sections.push(`${hashes} ${ONE_TIME_TITLE}\n\n${renderSponsorList(oneTime)}`);
	}

	return sections.length > 0 ? sections.join('\n\n') : EMPTY_STATE;
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
	const sections = renderTierSections(sponsors, tiers);
	const income = renderIncomeSummary(incomeOf);
	return `---
title: VersaTiles - Sponsors
description: The individuals and organizations who support VersaTiles.
menuEntry: Sponsors
githubLink: https://github.com/versatiles-org/versatiles-org.github.io/blob/main/sponsor.config.ts
---

# Sponsors

VersaTiles is free and self-hostable. If your team relies on it, please consider
chipping in so we can keep maintaining it.

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
	const sections = renderTierSections(sponsors, tiers);
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
