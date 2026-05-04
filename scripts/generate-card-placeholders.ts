/**
 * One-shot generator for placeholder card thumbnails.
 *
 * Reads docs/cards.yaml and emits a branded title-card PNG for each
 * card into docs/assets/cards/, sized 1600x1000 (the build pipeline
 * scales these down to the final 800x500 WebPs).
 *
 * Idempotent: by default, skips files that already exist so real
 * screenshots placed by hand are never overwritten. Pass --force to
 * regenerate everything.
 *
 * Usage:
 *   deno run -A scripts/generate-card-placeholders.ts
 *   deno run -A scripts/generate-card-placeholders.ts --force
 */

import { existsSync, ensureDirSync } from '@std/fs';
import { resolve } from '@std/path';
import { parse as parseYaml } from '@std/yaml';

const PROJECT_ROOT = new URL('..', import.meta.url).pathname;
const YAML_PATH = resolve(PROJECT_ROOT, 'docs/cards.yaml');
const OUT_DIR = resolve(PROJECT_ROOT, 'docs/assets/cards');

const WIDTH = 1600;
const HEIGHT = 1000;

// Accent colours per section, used as the gradient endpoint so the
// thumbnails read as a coherent set without all looking identical.
const SECTION_COLOR: Record<string, string> = {
	'🗺️ Live demos & tools': '#1f3a5e',
	'🛠 Servers & CLIs': '#3a2a5e',
	'📦 Libraries': '#1f5e4a',
	'🔣 Fonts & glyphs': '#5e3a1f',
	'📖 Spec & community': '#5e1f4a',
};

// macOS system font paths — present on every modern Mac.
const FONT_BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
const FONT_REG = '/System/Library/Fonts/Supplemental/Arial.ttf';

interface Card {
	title: string;
	hook: string;
	url: string;
	image?: string;
	repo?: string;
}
interface Section {
	title: string;
	cards: Card[];
}
interface CardsFile {
	sections: Section[];
}

const force = Deno.args.includes('--force');

const yaml = parseYaml(await Deno.readTextFile(YAML_PATH)) as CardsFile;
ensureDirSync(OUT_DIR);

let generated = 0;
let skipped = 0;

for (const section of yaml.sections) {
	const accent = SECTION_COLOR[section.title] ?? '#2e2e34';
	for (const card of section.cards) {
		// Card.image looks like "assets/cards/foo.webp"; the source PNG
		// lives next to it under the same name with .png.
		if (!card.image) continue;
		const pngName = card.image.replace(/^.*\//, '').replace(/\.webp$/i, '.png');
		const outPath = resolve(OUT_DIR, pngName);
		if (existsSync(outPath) && !force) {
			skipped++;
			continue;
		}

		await renderCard({
			title: stripMarkdown(card.title),
			subtitle: stripEmoji(section.title),
			accent,
			outPath,
		});
		generated++;
		console.log(`  generated ${pngName}`);
	}
}

console.log(`\nDone. Generated ${generated}, skipped ${skipped} (already existed).`);
if (skipped > 0 && !force) console.log('Re-run with --force to regenerate everything.');

// ---------------------------------------------------------------------------

async function renderCard(opts: {
	title: string;
	subtitle: string;
	accent: string;
	outPath: string;
}): Promise<void> {
	const { title, subtitle, accent, outPath } = opts;
	const fontSize = pickFontSize(title);

	const cmd = new Deno.Command('magick', {
		args: [
			'-size',
			`${WIDTH}x${HEIGHT}`,
			`gradient:${accent}-#15151a`,
			'-gravity',
			'center',
			'-fill',
			'#ffffff',
			'-font',
			FONT_BOLD,
			'-pointsize',
			String(fontSize),
			'-annotate',
			'+0-30',
			title,
			'-fill',
			'rgba(255,255,255,0.55)',
			'-font',
			FONT_REG,
			'-pointsize',
			'32',
			'-annotate',
			'+0+60',
			subtitle,
			outPath,
		],
		stdout: 'null',
		stderr: 'piped',
	});

	const result = await cmd.output();
	if (!result.success) {
		const err = new TextDecoder().decode(result.stderr).trim();
		throw new Error(`magick failed for "${outPath}": ${err}`);
	}
}

function pickFontSize(title: string): number {
	// Drop the font size for long titles so they don't overflow the canvas.
	if (title.length > 28) return 56;
	if (title.length > 20) return 72;
	return 88;
}

function stripMarkdown(text: string): string {
	// Strip backticks and emphasis markers so "*(experimental)*" reads cleanly
	// when rendered as plain text on the title card.
	return text.replace(/[`*_]/g, '').trim();
}

function stripEmoji(text: string): string {
	// Section titles start with an emoji (e.g. "🗺️ Live demos"); keep just
	// the words for the subtitle line.
	return text.replace(/^[^\w]+/, '').trim();
}
