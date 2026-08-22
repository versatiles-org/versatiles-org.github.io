/**
 * Builds a local `docs/sponsors/` so the sponsors page can be previewed without
 * SponsorKit credentials.
 *
 * The real assets are generated at deploy time by `npx sponsorkit`, which needs
 * SPONSORKIT_GITHUB_TOKEN and SPONSORKIT_OPENCOLLECTIVE_KEY. On a fresh
 * checkout the directory is simply absent, so `/sponsors/` builds with an empty
 * graphic and no names — awkward when you are working on the page itself.
 *
 * This script fills the gap by pulling the already-published `sponsors.json`
 * and `sponsors.svg` from the live site and re-running our own renderers over
 * them. It exercises the same code the deploy does — `toSponsorEntry`, the
 * filters, `summarizeIncome`, `renderSponsorsPage` — so what you see locally is
 * what CI will produce from the same input.
 *
 * Usage:
 *   npm run sponsors:fixture             # live data from versatiles.org
 *   npm run sponsors:fixture -- --demo   # plus synthetic edge cases
 *
 * The `--demo` flag appends sponsors the live feed cannot show you, because
 * SponsorKit filters them before publishing: a private sponsor (counted in the
 * income totals but never named) and an expired one (dropped everywhere). Use
 * it to check those paths render correctly.
 *
 * Output is gitignored and regenerated on every deploy, so it is always safe to
 * delete: `rm -rf docs/sponsors`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { config } from '../config.ts';
import {
	isActive,
	isNameable,
	type RawSponsorship,
	renderSponsorsListFile,
	renderSponsorsPage,
	SPONSOR_TIERS,
	summarizeIncome,
	toSponsorEntry,
} from './render.ts';

const OUT_DIR = resolve(process.cwd(), 'docs/sponsors');

/**
 * Sponsors that never appear in the published feed, so a live fixture cannot
 * cover them. Amounts are arbitrary; only the flags matter.
 */
const DEMO_SPONSORS: RawSponsorship[] = [
	{
		sponsor: { login: 'private-backer', name: 'A Private Backer' },
		monthlyDollars: 75,
		privacyLevel: 'PRIVATE',
	},
	{
		sponsor: { login: 'lapsed-supporter', name: 'A Lapsed Supporter' },
		monthlyDollars: -1,
	},
	{
		sponsor: { login: 'big-partner', name: 'Partner Corp', linkUrl: 'https://example.com' },
		monthlyDollars: 500,
	},
];

/** Fetch a published sponsor asset, failing loudly rather than half-writing. */
async function fetchAsset(name: string): Promise<Response> {
	const url = `${config.baseUrl}/sponsors/${name}`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
	}
	return response;
}

async function main() {
	const demo = process.argv.slice(2).includes('--demo');

	const [json, svg] = await Promise.all([
		fetchAsset('sponsors.json').then((r) => r.json() as Promise<RawSponsorship[]>),
		fetchAsset('sponsors.svg').then((r) => r.text()),
	]);

	const fetched = demo ? [...json, ...DEMO_SPONSORS] : json;

	// Mirrors sponsor.config.ts: every live sponsor is passed through, private
	// ones flagged `isAnonymous` so they are counted and tallied but never named.
	const active = fetched.filter(isActive);
	const listed = active.filter(isNameable);
	const entries = active.map(toSponsorEntry);
	const income = summarizeIncome(entries);

	mkdirSync(OUT_DIR, { recursive: true });
	writeFileSync(resolve(OUT_DIR, 'sponsors.svg'), svg);
	writeFileSync(resolve(OUT_DIR, 'index.md'), renderSponsorsPage(entries, SPONSOR_TIERS, income));
	writeFileSync(resolve(OUT_DIR, 'sponsors.txt'), renderSponsorsListFile(entries));
	writeFileSync(resolve(OUT_DIR, 'income.json'), JSON.stringify(income, null, '\t') + '\n');

	console.log(
		`[fixture] ${listed.length} listed of ${fetched.length} fetched — ` +
			`$${income.recurringMonthlyDollars}/month recurring (${income.recurringCount}), ` +
			`$${income.oneTimeDollars} one-time (${income.oneTimeCount})`,
	);
	console.log(`[fixture] wrote ${OUT_DIR}${demo ? ' (with demo sponsors)' : ''}`);
	console.log('[fixture] now run: npm run dev');
}

if (import.meta.main) await main();
