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
 * it filters before rendering — see `isPubliclyListed`.
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
import type { Sponsorship, Tier } from 'sponsorkit';
import {
	renderSponsorsListFile,
	renderSponsorsPage,
	type SponsorEntry,
	SPONSOR_TIERS,
	summarizeIncome,
} from './src/sponsors/render.ts';

// Pair each canonical tier with a render preset (bigger preset ⇒ bigger logo).
// SponsorKit requires exactly one tier without `monthlyDollars` (the base tier);
// our "Supporter" tier at threshold 0 fills that role.
const PRESET_BY_TITLE: Record<string, Tier['preset']> = {
	Supporter: tierPresets.small,
	Backer: tierPresets.medium,
	Sponsor: tierPresets.large,
	Partner: tierPresets.xl,
};

const tiers: Tier[] = SPONSOR_TIERS.map((tier) => ({
	title: tier.title,
	monthlyDollars: tier.minMonthlyDollars === 0 ? undefined : tier.minMonthlyDollars,
	preset: PRESET_BY_TITLE[tier.title],
}));

/**
 * Whether a sponsorship is still live.
 *
 * `includePastSponsors` pulls expired records (`monthlyDollars: -1`) into the
 * fetch so `prorateOnetime` can decay one-time gifts, but they must never reach
 * a renderer: SponsorKit's `partitionTiers` has no bucket for a negative amount
 * and falls back to the *first* tier, so a long-lapsed $5 sponsor would be
 * drawn as a Partner at XL size.
 */
function isActive(s: Sponsorship): boolean {
	return s.monthlyDollars > 0;
}

/**
 * Whether a sponsor consented to being named.
 *
 * SponsorKit strips private sponsors from the SVG/PNG/JSON, but only after
 * `onSponsorsReady` has run — so the Markdown lists were naming someone who
 * asked not to be shown. That is why the page listed seven sponsors while
 * `sponsors.json` held six.
 *
 * Their money still counts towards the income totals: an aggregate reveals no
 * identity, and excluding it would understate what the project actually
 * receives.
 */
function isNameable(s: Sponsorship): boolean {
	return s.privacyLevel !== 'PRIVATE';
}

/** Adapt a SponsorKit sponsorship into the minimal shape the name lists need. */
function toEntry(s: Sponsorship): SponsorEntry {
	const { login, name, websiteUrl, linkUrl } = s.sponsor;
	return {
		name: name || login,
		link: linkUrl || websiteUrl || (login ? `https://github.com/${login}` : ''),
		monthlyDollars: s.monthlyDollars,
		// SponsorKit reports one-time gifts in `monthlyDollars` too, so the
		// income summary needs this flag to avoid counting them as recurring.
		isOneTime: s.isOneTime ?? false,
	};
}

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
		const income = summarizeIncome(active.map(toEntry));

		const entries = listed.map(toEntry);
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
