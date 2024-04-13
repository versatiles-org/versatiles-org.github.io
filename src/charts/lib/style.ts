import { createElement } from './svg.ts';

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
	private readonly lookup = new Map<string, Style>();

	public asText(): string {
		const styleSheet = new Array<string>();
		for (const [nodeId, style] of this.lookup.entries()) {
			const node = createElement('g');

			for (const cssKey in style) {
				const cssValue = style[cssKey];
				if (cssValue == null) {
					node.style.removeProperty(cssKey);
				} else {
					node.style[cssKey] = cssValue;
				}
			}

			styleSheet.push(`#${nodeId} {${node.style.cssText}}`);
		}
		return styleSheet.join('\n');
	}

	public set(nodeId: string, key: keyof MultiStyle, value: string | undefined = undefined): void {
		const item = this.lookup.get(nodeId);
		if (item == null) {
			this.lookup.set(nodeId, { [key]: value });
		} else {
			item[key] = value;
		}
	}
}
