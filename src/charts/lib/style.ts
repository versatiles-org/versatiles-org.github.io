import { createElement } from "./svg.ts";

export type Style = Partial<CSSStyleDeclaration>;
export type MultiColor = string | [string, string];
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

export class GlobalStyle {
	private readonly lookup = new Map<string, Style>()

	asText(): string {
		const styleSheet = new Array<string>();
		for (const [key, style] of this.lookup.entries()) {
			const node = createElement('g');

			for (let key in style) {
				const value = style[key];
				if (value == null) {
					node.style.removeProperty(key);
				} else {
					node.style[key] = value;
				}
			}

			styleSheet.push(`#${key} {${node.style.cssText}}`)
		}
		return styleSheet.join('\n');
	}

	set(nodeId: string, key: keyof MultiStyle, value: string | undefined = undefined) {
		let item = this.lookup.get(nodeId);
		if (item == null) {
			this.lookup.set(nodeId, { [key]: value });
		} else {
			item[key] = value;
		}
	}
}
