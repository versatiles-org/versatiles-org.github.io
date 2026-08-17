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
 * runs SponsorKit before `deno task build` so the assets are baked into the
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
 *   Sponsor    $100
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
 *     dollars, and skew MONTHLY_GOAL_DOLLARS along with them.
 *
 * Credentials come from the environment (never commit them). See the workflow:
 *   SPONSORKIT_GITHUB_TOKEN, SPONSORKIT_OPENCOLLECTIVE_KEY
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { defineConfig, tierPresets } from 'sponsorkit';
import type { Tier } from 'sponsorkit';
import {
	isActive,
	isNameable,
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
 * Pair each canonical tier with a render preset (bigger avatar ⇒ more prominent).
 * SponsorKit requires exactly one tier without `monthlyDollars` (the base tier);
 * our "Supporter" tier at threshold 0 fills that role.
 *
 * Every tier keeps its stock avatar size — that is what signals prominence — but
 * gets a box wide enough for a 16-character name. Names render at 12px (see
 * `svgInlineCSS`), averaging roughly 6.6px per character, so 16 characters need
 * about 105px. Supporter also needs a taller box: its stock 38px leaves no room
 * under the avatar for a name line, which sits at `avatarSize + 18`.
 */
const PRESET_BY_TITLE: Record<string, Tier['preset']> = {
	Supporter: { ...tierPresets.small, boxWidth: 110, boxHeight: 64, name: NAME },
	Backer: { ...tierPresets.medium, boxWidth: 110, name: NAME },
	Sponsor: { ...tierPresets.large, boxWidth: 115, name: NAME },
	Partner: { ...tierPresets.xl, boxWidth: 130, name: NAME },
};

const tiers: Tier[] = SPONSOR_TIERS.map((tier) => ({
	title: tier.title,
	monthlyDollars: tier.minMonthlyDollars === 0 ? undefined : tier.minMonthlyDollars,
	preset: PRESET_BY_TITLE[tier.title],
}));

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
	prorateOnetime: true,
	includePastSponsors: true,

	// --- Output ---
	// Written under `docs/` so the build publishes them to versatiles.org/sponsors/.
	outputDir: 'docs/sponsors',
	name: 'sponsors',
	formats: ['svg', 'png', 'json'],

	// --- Rendering ---
	renderer: 'tiers',
	width: 800,
	tiers,

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
	onSponsorsReady(sponsors) {
		const active = sponsors.filter(isActive);
		const listed = active.filter(isNameable);

		// Recurring vs one-time income, gross, over every live sponsor — including
		// the private ones the lists below leave unnamed. See `summarizeIncome`
		// for what the figures do and don't cover.
		const income = summarizeIncome(active.map(toSponsorEntry));

		const entries = listed.map(toSponsorEntry);
		writeFileSync(
			resolve(process.cwd(), 'docs/sponsors/index.md'),
			renderSponsorsPage(entries, SPONSOR_TIERS, income),
		);
		// `.txt` so the CMS copies it verbatim; a `.md` here would be rendered to
		// HTML (and would need YAML front matter to build at all).
		writeFileSync(resolve(process.cwd(), 'docs/sponsors/sponsors.txt'), renderSponsorsListFile(entries));

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
