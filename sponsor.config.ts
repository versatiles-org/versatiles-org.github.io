/**
 * SponsorKit configuration for VersaTiles — the single source of truth for
 * sponsor assets. Every consumer (this website, the org READMEs, the sponsors
 * list) reads from the files generated here.
 *
 * Providers:
 *   - GitHub Sponsors  → https://github.com/sponsors/versatiles-org
 *   - Open Collective  → https://opencollective.com/versatiles
 *
 * Generated fresh on every deploy and never committed to git — the CI build
 * runs SponsorKit before `npm run build` so the assets are baked into the
 * GitHub Pages artifact (see `.github/workflows/gh-release.yml`). Outputs, all
 * served under https://versatiles.org/sponsors/:
 *   - docs/sponsors/sponsors.svg   → embedded on the website (crisp, scalable)
 *   - docs/sponsors/sponsors.png   → for READMEs; GitHub's camo image proxy
 *                                     renders PNG reliably, inline SVG often not
 *   - docs/sponsors/sponsors.json  → machine-readable list for other consumers
 *   - docs/sponsors/index.md       → the /sponsors/ page (rendered by the CMS)
 *   - docs/sponsors/sponsors.txt   → plain name list (fulfils the "$5 → your
 *                                     name joins the SPONSORS list" promise).
 *                                     Uses `.txt`, not `.md`, so the CMS serves
 *                                     it verbatim instead of rendering it to HTML.
 *   - docs/sponsors/income.json    → recurring vs one-time totals, gross
 *
 * Tiers — higher tier ⇒ larger logo ⇒ more prominent placement:
 *   Supporter  $5    (entry / catch-all base tier)
 *   Backer     $25
 *   Sustainer  $100
 *   Partner    $500
 *
 * The tier thresholds and all Markdown rendering live in the unit-tested
 * `src/sponsors/render.ts`; this file only wires SponsorKit to them.
 *
 * One-time gifts — `prorateOnetime` spreads a single contribution across the
 * months it covers instead of dropping the sponsor the moment GitHub stops
 * marking the sponsorship active. It needs `includePastSponsors` to do anything
 * at all: without it the GitHub query runs with `activeOnly: true`, so an
 * inactive sponsorship is never fetched and the proration branch is dead code.
 * Together they mean expired records now reach `onSponsorsReady`, which is why
 * it filters before rendering — see `isActive` in `src/sponsors/render.ts`.
 *
 * Currency — everything downstream assumes USD:
 *   - GitHub always reports `monthlyPriceInDollars`, so that side is USD by
 *     construction.
 *   - SponsorKit's Open Collective provider copies `order.amount.value` into
 *     `monthlyDollars` without requesting a currency or converting (unlike its
 *     Afdian/Liberapay providers, which do convert). Our collective is
 *     configured in USD, so this is correct today — but switching the
 *     collective to another currency would silently mislabel those amounts as
 *     dollars, and skew the funding figures on the page along with them.
 *
 * Credentials come from the environment (never commit them). See the workflow:
 *   SPONSORKIT_GITHUB_TOKEN, SPONSORKIT_OPENCOLLECTIVE_KEY
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { defineConfig, tierPresets } from 'sponsorkit';
import type { Sponsorship, Tier } from 'sponsorkit';
import {
	isActive,
	isNameable,
	isPlaceholderProfile,
	ONE_TIME_TITLE,
	renderSponsorsListFile,
	renderSponsorsPage,
	SPONSOR_TIERS,
	summarizeIncome,
	toSponsorEntry,
} from './src/sponsors/render.ts';

/**
 * How many characters of a sponsor's name the graphic shows.
 *
 * SponsorKit's stock presets clip hard: `small` renders no name at all, and
 * `medium` cuts at 10 characters — which turned "mapforge-org" into "mapforg..."
 * and "simon-jonathan" into "simon-j...". A name containing a space is cut to
 * its first word instead, so "Roman Plessl" rendered as "Roman".
 *
 * 16 fits every name we currently have; the longest, "Guido Gallenkamp", is
 * exactly 16. Longer names still get an ellipsis — that is unavoidable in a
 * fixed grid — but no one is mangled at today's sizes.
 */
const NAME = { maxLength: 16 };

/**
 * Pair each tier with a render preset. Avatar size is the whole prominence
 * signal, so it descends strictly with the level of commitment:
 *
 *   Partner 90 › Sustainer 70 › Backer 50 › Supporter 35 › one-time 25
 *
 * One-time gifts sit below every recurring tier deliberately. The tiers rank
 * ongoing commitment — what the project can actually plan around — not the size
 * of a single payment, so a lapsing gift should never outrank a standing pledge.
 *
 * Box widths are about names, not prominence: names render at 12px (see
 * `svgInlineCSS`), averaging roughly 6.6px per character, so a 16-character name
 * needs about 105px whatever the avatar size. The two smallest presets also need
 * an explicit `boxHeight` — their stock values leave no room under the avatar for
 * a name line, which sits at `avatarSize + 18`.
 *
 * SponsorKit requires exactly one tier without `monthlyDollars` (the base tier);
 * our "Supporter" tier at threshold 0 fills that role.
 */
const PRESET_BY_TITLE: Record<string, Tier['preset']> = {
	Partner: { ...tierPresets.xl, boxWidth: 130, name: NAME },
	Sustainer: { ...tierPresets.large, boxWidth: 115, name: NAME },
	Backer: { ...tierPresets.medium, boxWidth: 110, name: NAME },
	Supporter: { ...tierPresets.small, boxWidth: 110, boxHeight: 64, name: NAME },
	[ONE_TIME_TITLE]: { ...tierPresets.xs, boxWidth: 110, boxHeight: 52, name: NAME },
};

/**
 * Amount stamped on one-time gifts so the graphic can bucket them separately.
 *
 * SponsorKit's `partitionTiers` only reads `monthlyDollars`, so a $100 one-time
 * gift would otherwise be drawn in the $100/month "Sustainer" tier, outranking a
 * standing $25/month pledge — exactly the inversion the Markdown lists avoid.
 * No recurring sponsor can be negative, so a negative threshold is an exclusive
 * bucket. Applied in `onBeforeRenderer`, never to the data we write ourselves.
 */
const ONE_TIME_DOLLARS = -1;

/**
 * The canonical tiers plus a trailing bucket for one-time gifts. Sorted by
 * amount, `ONE_TIME_DOLLARS` places it last — the same order the Markdown uses.
 *
 * "Supporter" is still the only tier resolving to 0, which `partitionTiers`
 * requires (it throws otherwise). The one-time bucket is ignored by proration,
 * which only considers tiers with a positive `monthlyDollars`.
 */
const tiers: Tier[] = [
	...SPONSOR_TIERS.map((tier) => {
		// `PRESET_BY_TITLE` is keyed by tier title, so renaming a tier in
		// `SPONSOR_TIERS` without renaming the key here would leave the preset
		// undefined — and SponsorKit quietly falls back to `tierPresets.base`,
		// which has no `name`, dropping that tier's names from the graphic. Fail
		// loudly instead of shipping a silently degraded image.
		const preset = PRESET_BY_TITLE[tier.title];
		if (!preset) throw new Error(`No render preset for tier "${tier.title}"`);
		return {
			title: tier.title,
			monthlyDollars: tier.minMonthlyDollars === 0 ? undefined : tier.minMonthlyDollars,
			preset,
		};
	}),
	{
		title: ONE_TIME_TITLE,
		monthlyDollars: ONE_TIME_DOLLARS,
		preset: PRESET_BY_TITLE[ONE_TIME_TITLE],
	},
];

export default defineConfig({
	// --- Providers (tokens/keys are read from the environment) ---
	github: {
		login: 'versatiles-org',
		type: 'organization',
	},
	opencollective: {
		slug: 'versatiles',
	},

	// Combine a person sponsoring via both GitHub and Open Collective into one.
	sponsorsAutoMerge: true,

	// Decay a one-time gift across the months it covers rather than dropping the
	// sponsor as soon as the sponsorship goes inactive. `includePastSponsors` is
	// what makes the fetch return those inactive records in the first place; on
	// its own `prorateOnetime` would never run. Expired entries are filtered out
	// again in `onSponsorsReady` (GitHub only — the Open Collective provider has
	// no proration path, so one-time gifts there still lapse immediately).
	//
	// `includePastSponsors` is load-bearing twice over: `partitionTiers` keeps a
	// sponsor only if `monthlyDollars > 0 || includePastSponsors`, so turning it
	// off would also drop every one-time gift out of the graphic, since they are
	// stamped with the negative ONE_TIME_DOLLARS before rendering.
	prorateOnetime: true,
	includePastSponsors: true,

	// --- Output ---
	// Written under `docs/` so the build publishes them to versatiles.org/sponsors/.
	outputDir: 'docs/sponsors',
	name: 'sponsors',
	// No 'json': `onSponsorsReady` writes sponsors.json itself, from amounts the
	// providers actually reported rather than the render-only sentinel below.
	formats: ['svg', 'png'],

	// --- Rendering ---
	renderer: 'tiers',
	width: 800,
	tiers,

	/**
	 * Move one-time gifts into their own tier for the picture only.
	 *
	 * Returns new objects rather than mutating: the array SponsorKit hands us is
	 * a shallow copy, so editing a sponsor in place would corrupt the amounts
	 * everywhere else. `sponsors.json` is written by `onSponsorsReady` from the
	 * untouched list, which is why `formats` above stops at svg/png — SponsorKit
	 * serialises its JSON from the same array it draws from, sentinel included.
	 */
	onBeforeRenderer: (sponsors: Sponsorship[]) =>
		sponsors.map((s) => {
			const next = s.isOneTime ? { ...s, monthlyDollars: ONE_TIME_DOLLARS } : s;
			// Drop the link on Open Collective's throwaway guest slugs. SponsorKit
			// omits the `href` entirely when neither URL is set, so the avatar stops
			// being a link to an empty profile page — in the READMEs as well as on
			// the website, where inlining made these links clickable.
			if (!isPlaceholderProfile(next.sponsor.login)) return next;
			return {
				...next,
				sponsor: { ...next.sponsor, websiteUrl: undefined, linkUrl: undefined },
			};
		}),

	// SponsorKit's default stylesheet, with names dropped to 12px so a
	// 16-character name fits the box widths above. Everything else is its
	// default verbatim. The website strips this block when it inlines the SVG
	// and restyles it from `sponsor.less`; this is what the READMEs get.
	svgInlineCSS: `
text {
  font-weight: 300;
  font-size: 14px;
  fill: #777777;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}
.sponsorkit-link {
  cursor: pointer;
}
.sponsorkit-name {
  font-size: 12px;
}
.sponsorkit-tier-title {
  font-weight: 500;
  font-size: 20px;
}
`,

	/**
	 * After all sponsors are fetched and merged, write the Markdown and income
	 * outputs, then hand back the list SponsorKit should render.
	 *
	 * Runs before the SVG/PNG/JSON are produced, so returning the filtered list
	 * is what keeps every output of a run describing the same sponsors.
	 */
	onSponsorsReady(sponsors: Sponsorship[]) {
		const active = sponsors.filter(isActive);
		const listed = active.filter(isNameable);

		// Every live sponsor, private ones flagged `isAnonymous` rather than
		// dropped: they are counted in the income totals and tallied at the foot
		// of the lists, but never named. See `summarizeIncome` for what the
		// figures do and don't cover.
		const entries = active.map(toSponsorEntry);
		const income = summarizeIncome(entries);
		writeFileSync(
			resolve(process.cwd(), 'docs/sponsors/index.md'),
			renderSponsorsPage(entries, SPONSOR_TIERS, income),
		);
		// `.txt` so the CMS copies it verbatim; a `.md` here would be rendered to
		// HTML (and would need YAML front matter to build at all).
		writeFileSync(
			resolve(process.cwd(), 'docs/sponsors/sponsors.txt'),
			renderSponsorsListFile(entries),
		);

		// Written here rather than via `formats`, so it records the real amounts
		// instead of the one-time sentinel `onBeforeRenderer` applies. Avatars are
		// already resolved by this point, and the 2-space indent matches what
		// SponsorKit used to emit, so consumers see no change.
		writeFileSync(
			resolve(process.cwd(), 'docs/sponsors/sponsors.json'),
			JSON.stringify(listed, null, 2),
		);

		writeFileSync(
			resolve(process.cwd(), 'docs/sponsors/income.json'),
			JSON.stringify(income, null, '\t') + '\n',
		);
		console.log(
			`[sponsors] ${listed.length} listed of ${sponsors.length} fetched — ` +
				`$${income.recurringMonthlyDollars}/month recurring (${income.recurringCount}), ` +
				`$${income.oneTimeDollars} one-time (${income.oneTimeCount})`,
		);

		// Returning the filtered list replaces the one SponsorKit renders, so the
		// SVG, PNG, JSON and Markdown all describe exactly the same sponsors.
		return listed;
	},
});
