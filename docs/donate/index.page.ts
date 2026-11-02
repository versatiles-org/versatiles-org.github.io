import type { PageResult } from '../../src/cms/types.ts';
import { renderDonatePage } from '../../src/sponsors/render.ts';

export default function donatePage(): PageResult {
	return {
		title: 'VersaTiles - Donate',
		description: 'Help keep the free VersaTiles maps, tools and downloads running.',
		menuEntry: 'Donate',
		html: renderDonatePage(),
	};
}
