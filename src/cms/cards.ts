import { existsSync } from '@std/fs';
import { resolve } from '@std/path';
import { parse as parseYaml } from '@std/yaml';
import { renderInlineMarkdown } from './markdown.ts';

/**
 * A single discovery card on the front page.
 */
interface Card {
	/** Plain-text card title. */
	title: string;
	/** Short description; may contain inline markdown (links, code, emphasis). */
	hook: string;
	/** Primary click target — the whole card links here. */
	url: string;
	/** Optional thumbnail path relative to docs/, e.g. assets/cards/foo.webp */
	image?: string;
	/** Optional secondary link, rendered as a small "Source" link. */
	repo?: string;
}

/**
 * A group of cards rendered under a shared heading.
 */
interface Section {
	title: string;
	cards: Card[];
}

interface CardsFile {
	sections: Section[];
}

interface RenderOptions {
	/**
	 * Optional directory used to resolve `image` paths. When set, cards whose
	 * image file does not exist on disk are rendered with a placeholder
	 * thumbnail instead of a broken `<img>` tag — useful while screenshots
	 * are still being captured.
	 */
	imageBaseDir?: string;
}

/**
 * Reads the YAML cards file and returns the rendered HTML for the discovery
 * grid. The output is intended to replace a `<!-- cards -->` placeholder
 * inside a page body.
 *
 * @param filePath - Absolute path to the YAML file
 * @param options - Render options (see {@link RenderOptions})
 * @returns HTML string containing one `<section>` per group
 * @throws {Error} If the file is missing, unparseable, or has invalid shape
 */
export function renderCardsFromFile(filePath: string, options: RenderOptions = {}): string {
	let raw: string;
	try {
		raw = Deno.readTextFileSync(filePath);
	} catch (error) {
		throw new Error(`Failed to read cards file "${filePath}"`, { cause: error });
	}

	let parsed: unknown;
	try {
		parsed = parseYaml(raw);
	} catch (error) {
		throw new Error(`Failed to parse YAML in "${filePath}"`, { cause: error });
	}

	const data = validate(parsed, filePath);
	return data.sections.map((section) => renderSection(section, options)).join('\n');
}

function renderSection(section: Section, options: RenderOptions): string {
	const heading = renderInlineMarkdown(section.title);
	const cards = section.cards.map((card) => renderCard(card, options)).join('\n');
	return `<section class="cards-section">
<h3>${heading}</h3>
<div class="cards-grid">
${cards}
</div>
</section>`;
}

function renderCard(card: Card, options: RenderOptions): string {
	const title = renderInlineMarkdown(card.title);
	const hook = renderInlineMarkdown(card.hook);
	const hasUsableImage = card.image && imageExists(card.image, options.imageBaseDir);
	const thumb = hasUsableImage
		? `<img class="card__thumb" src="/${card.image}" alt="" loading="lazy">`
		: `<div class="card__thumb card__thumb--placeholder" aria-hidden="true"></div>`;
	const repo = card.repo
		? `<a class="card__repo" href="${escapeAttr(card.repo)}" rel="noopener" aria-label="${
			escapeAttr(card.title)
		} source on GitHub">Source</a>`
		: '';
	return `<article class="card">
${thumb}
<h4 class="card__title"><a class="card__link" href="${escapeAttr(card.url)}">${title}</a></h4>
<p class="card__hook">${hook}</p>
${repo}
</article>`;
}

function imageExists(image: string, baseDir: string | undefined): boolean {
	// Without a base directory we can't verify the file; trust the path.
	if (!baseDir) return true;
	return existsSync(resolve(baseDir, image));
}

function escapeAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function validate(value: unknown, filePath: string): CardsFile {
	if (typeof value !== 'object' || value === null) {
		throw new Error(`Cards file "${filePath}" must be a YAML object`);
	}
	const root = value as Record<string, unknown>;
	if (!Array.isArray(root.sections)) {
		throw new Error(`Cards file "${filePath}" must have a "sections" array`);
	}
	const sections: Section[] = root.sections.map((s, i) => validateSection(s, i, filePath));
	return { sections };
}

function validateSection(value: unknown, index: number, filePath: string): Section {
	if (typeof value !== 'object' || value === null) {
		throw new Error(`Section #${index} in "${filePath}" must be an object`);
	}
	const obj = value as Record<string, unknown>;
	if (typeof obj.title !== 'string') {
		throw new Error(`Section #${index} in "${filePath}" is missing a string "title"`);
	}
	if (!Array.isArray(obj.cards)) {
		throw new Error(`Section "${obj.title}" in "${filePath}" must have a "cards" array`);
	}
	const cards: Card[] = obj.cards.map((c, i) => validateCard(c, obj.title as string, i, filePath));
	return { title: obj.title, cards };
}

function validateCard(
	value: unknown,
	sectionTitle: string,
	index: number,
	filePath: string,
): Card {
	if (typeof value !== 'object' || value === null) {
		throw new Error(`Card #${index} in section "${sectionTitle}" must be an object`);
	}
	const obj = value as Record<string, unknown>;
	for (const key of ['title', 'hook', 'url'] as const) {
		if (typeof obj[key] !== 'string' || obj[key] === '') {
			throw new Error(
				`Card #${index} in section "${sectionTitle}" is missing required string "${key}" (in ${filePath})`,
			);
		}
	}
	for (const key of ['image', 'repo'] as const) {
		if (obj[key] !== undefined && typeof obj[key] !== 'string') {
			throw new Error(
				`Card "${obj.title}" in section "${sectionTitle}" has non-string "${key}"`,
			);
		}
	}
	return {
		title: obj.title as string,
		hook: obj.hook as string,
		url: obj.url as string,
		image: obj.image as string | undefined,
		repo: obj.repo as string | undefined,
	};
}
