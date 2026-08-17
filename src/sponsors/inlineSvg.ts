/**
 * Prepares the generated `sponsors.svg` for inlining into the sponsors page.
 *
 * The page used to embed the file with `<img src="/sponsors/sponsors.svg">`.
 * That renders SVG in a non-interactive mode, so the six per-sponsor `<a>`
 * elements SponsorKit puts in the file were dead — the whole block was wrapped
 * in a single link back to our own sponsor page instead. Inlining the markup
 * makes those links work and lets `sponsor.less` style the result.
 *
 * The standalone file is still generated and copied to `/sponsors/sponsors.svg`
 * unchanged, because the org READMEs embed it through GitHub's image proxy.
 * Only the inlined copy is rewritten here.
 */

/** Escape a string for use inside a double-quoted HTML attribute. */
function escapeAttr(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/**
 * Rewrite a standalone sponsors SVG into markup safe to drop into the page.
 *
 * Applies four changes:
 *   1. Strips an XML prolog or doctype — valid in a standalone file, not inside
 *      an HTML document.
 *   2. Strips the internal `<style>` block. Inlined, its bare `text { … }`
 *      selector would become document-scoped and leak to any other SVG on the
 *      page; `sponsor.less` restyles the inlined copy under `.sponsor-logos`
 *      instead, which is also where the contrast is fixed.
 *   3. Drops the fixed `width`/`height` so CSS can size it, keeping the
 *      `viewBox` that makes it scale.
 *   4. Gives the now-live links an accessible name and `rel="noopener"`. Several
 *      sponsors render as an avatar with no text, so without a label their link
 *      would announce as nothing at all.
 *
 * @param svg Contents of the generated `sponsors.svg`.
 * @param label Accessible name for the graphic as a whole.
 * @returns Inline-ready SVG markup.
 */
export function inlineSponsorSvg(svg: string, label = 'VersaTiles sponsors'): string {
	let out = svg.trim()
		.replace(/^<\?xml[^>]*\?>\s*/i, '')
		.replace(/^<!DOCTYPE[^>]*>\s*/i, '')
		.replace(/<style>[\s\S]*?<\/style>\s*/i, '');

	out = out.replace(/^<svg\b[^>]*>/i, (tag) => {
		const next = tag.replace(/\s+(?:width|height)="[^"]*"/gi, '');
		return /\baria-label=/i.test(next)
			? next
			: next.replace(/^<svg\b/i, `<svg aria-label="${escapeAttr(label)}"`);
	});

	out = out.replace(/<a\b[^>]*>/gi, (tag) => {
		let next = tag;
		const id = /\bid="([^"]*)"/i.exec(next)?.[1];
		if (id && !/\baria-label=/i.test(next)) {
			next = next.replace(/^<a\b/i, `<a aria-label="${escapeAttr(id)}"`);
		}
		if (/\btarget="_blank"/i.test(next) && !/\brel=/i.test(next)) {
			next = next.replace(/^<a\b/i, '<a rel="noopener"');
		}
		return next;
	});

	return out;
}
