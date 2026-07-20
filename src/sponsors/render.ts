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

/** Sponsor call-to-action buttons, styled by `docs/assets/style/sponsor.less`. */
const SPONSOR_BUTTONS = `<div id="sponsor-buttons">
	<a class="sponsor-btn sponsor-btn--github" href="https://github.com/sponsors/versatiles-org" rel="noopener" target="_blank">Sponsor on GitHub</a>
	<a class="sponsor-btn sponsor-btn--oc" href="https://opencollective.com/versatiles" rel="noopener" target="_blank">Sponsor on Open Collective</a>
</div>`;

const GENERATED_NOTICE =
	'<sub>Generated automatically by [SponsorKit](https://github.com/antfu-collective/sponsorkit) from `sponsor.config.ts` — do not edit by hand.</sub>';

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

/** Render one tier's sponsors as a Markdown bullet list of linked names. */
export function renderSponsorList(sponsors: SponsorEntry[]): string {
	return sponsors
		.map((s) => (s.link ? `- [${s.name}](${s.link})` : `- ${s.name}`))
		.join('\n');
}

/** Render `### Tier` sections for every non-empty tier, highest first. */
export function renderTierSections(sponsors: SponsorEntry[], tiers: SponsorTier[]): string {
	const sections = groupByTier(sponsors, tiers)
		.filter((g) => g.sponsors.length > 0)
		.map((g) => `### ${g.tier.title}\n\n${renderSponsorList(g.sponsors)}`);

	return sections.length > 0 ? sections.join('\n\n') : EMPTY_STATE;
}

/**
 * Build the full https://versatiles.org/sponsors/ page (with YAML front matter
 * so the CMS renders it with the site template).
 */
export function renderSponsorsPage(sponsors: SponsorEntry[], tiers = SPONSOR_TIERS): string {
	const sections = renderTierSections(sponsors, tiers);
	return `---
title: VersaTiles - Sponsors
description: The individuals and organizations who support VersaTiles.
menuEntry: Sponsors
githubLink: https://github.com/versatiles-org/versatiles-org.github.io/blob/main/sponsor.config.ts
---

# Sponsors

VersaTiles is free and self-hostable. If your team relies on it, please consider
chipping in so we can keep maintaining it.

${SPONSOR_BUTTONS}

<div class="sponsor-logos">
	<a href="https://github.com/sponsors/versatiles-org" rel="noopener" target="_blank"><img src="/sponsors/sponsors.svg" alt="VersaTiles sponsors"></a>
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
