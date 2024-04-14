/* eslint-disable @typescript-eslint/prefer-destructuring */
import { createElement } from './svg.ts';

// Defines types for style properties and color configurations.
export type Style = Partial<CSSStyleDeclaration>;
export type MultiColor = string | [string, string];

// Interface for specialized style properties with extended attributes.
export interface MultiStyle {
	fontFamily?: string;
	fontSize?: string;
	strokeWidth?: string;
	stroke?: MultiColor;
	fill?: MultiColor;
	fillOpacity?: string;
	dominantBaseline?: string;
	textAnchor?: string;
}

// Class for managing and aggregating global styles across SVG elements.
export class GlobalStyle {
	// Holds style values with references to node IDs and CSS properties.
	private readonly valueLookup = new Map<string, { nodeId: string; cssKey: keyof MultiStyle; cssValue: string }>();

	// Converts the stored styles into a single CSS stylesheet string.
	public asText(): string {
		const styleSheet = new Array<string>();
		const newValueLookup = new Map(this.valueLookup);

		// Iteratively process all styles until no styles remain in the lookup.
		while (newValueLookup.size > 0) {
			const nodeIds = getSimilarNodeIds();
			styleSheet.push(getCommonStyleString(nodeIds));
		}

		return styleSheet.join('\n');

		// Identifies node IDs that share the same style property and value.
		function getSimilarNodeIds(): string[] {
			const counter = new Map<string, { cssKey: string; cssValue: string; nodeIds: string[] }>();
			for (const { cssKey, cssValue, nodeId } of newValueLookup.values()) {
				const key = cssKey + ':' + cssValue;
				let item = counter.get(key);
				if (!item) counter.set(key, item = { cssKey, cssValue, nodeIds: [] });
				item.nodeIds.push(nodeId);
			}
			const list = Array.from(counter.values());
			list.sort((a, b) => b.nodeIds.length - a.nodeIds.length);
			return list[0].nodeIds;
		}

		// Generates CSS style strings for a group of nodes sharing the same properties.
		function getCommonStyleString(nodeIdList: string[]): string {
			const nodeIdSet = new Set(nodeIdList);
			const cssKeySet = new Set<keyof MultiStyle>();

			// Collect all CSS keys used by the node IDs in the list.
			for (const { nodeId, cssKey } of newValueLookup.values()) {
				if (!nodeIdSet.has(nodeId)) continue;
				cssKeySet.add(cssKey);
			}
			const cssKeyList = Array.from(cssKeySet.values());

			// Collect all CSS values used by all combinations of node ID and CSS key.
			const styleMap = new Map<keyof MultiStyle, Set<string | undefined>>();
			for (const nodeId of nodeIdList) {
				for (const cssKey of cssKeyList) {
					const key = nodeId + ':' + cssKey;
					const cssValue = newValueLookup.get(key)?.cssValue;
					let item = styleMap.get(cssKey);
					if (!item) styleMap.set(cssKey, item = new Set());
					item.add(cssValue);
				}
			}

			// Create a CSS style, but only use CSS keys, where all CSS values are the same.
			const node = createElement('g');
			for (const [cssKey, cssValueSet] of styleMap.entries()) {
				if (cssValueSet.size !== 1) continue;
				const cssValue = Array.from(cssValueSet.values())[0];
				if (cssValue === undefined) continue;

				node.style[cssKey] = cssValue;

				nodeIdList.forEach(nodeId => {
					const key = nodeId + ':' + cssKey;
					newValueLookup.delete(key);
				});
			}

			const nodeIdString = nodeIdList.map(id => '#' + id).join(',');
			return `${nodeIdString} {${node.style.cssText}}`;
		}
	}

	// Updates the style for a specific node with the option to delete it if the value is undefined.
	public set(nodeId: string, cssKey: keyof MultiStyle, cssValue: string | undefined = undefined): void {
		const key = nodeId + ':' + cssKey;
		if (cssValue == null) {
			this.valueLookup.delete(key);
		} else {
			this.valueLookup.set(key, { nodeId, cssKey, cssValue });
		}
	}
}
