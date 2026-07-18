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

/** Adapt a SponsorKit sponsorship into the minimal shape the name lists need. */
function toEntry(s: Sponsorship): SponsorEntry {
	const { login, name, websiteUrl, linkUrl } = s.sponsor;
	return {
		name: name || login,
		link: linkUrl || websiteUrl || (login ? `https://github.com/${login}` : ''),
		monthlyDollars: s.monthlyDollars,
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
	 * After all sponsors are fetched and merged, write the two Markdown outputs.
	 * Runs before the SVG/PNG are rendered in the same invocation, so every
	 * output of a run is mutually consistent.
	 */
	onSponsorsReady(sponsors) {
		const entries = sponsors.map(toEntry);
		writeFileSync(resolve(process.cwd(), 'docs/sponsors/index.md'), renderSponsorsPage(entries));
		// `.txt` so the CMS copies it verbatim; a `.md` here would be rendered to
		// HTML (and would need YAML front matter to build at all).
		writeFileSync(resolve(process.cwd(), 'docs/sponsors/sponsors.txt'), renderSponsorsListFile(entries));
	},
});
