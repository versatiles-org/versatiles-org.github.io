import { BBox } from './bbox.ts';
import { JSDOM } from 'jsdom';

export type BBoxType = [number, number, number, number];
export type RectType = [number, number, number, number];
export type PointType = [number, number];
type Style = Partial<CSSStyleDeclaration>;

const { document } = (new JSDOM('')).window;

export class Canvas {
	private readonly node: SVGElement;
	private readonly bbox: BBox;
	private readonly subGroups: Canvas[];
	private readonly script: string[] = [];
	private readonly style: string[] = [];

	constructor() {
		this.node = getElement('g');
		this.bbox = new BBox();
		this.subGroups = [];
	}
	getBBox() {
		let bbox = this.bbox.clone();
		this.subGroups.forEach(g => bbox.includeBBox(g.getBBox()));
		return bbox;
	}
	asSVG(padding = 5, id?: string) {
		if (id) setAttributes(this.node, { id });
		let svg = getElement('svg');
		let bbox = this.getBBox();
		bbox.addPadding(padding);
		svg.insertAdjacentHTML('afterbegin', `<filter id="highlight">
			<feColorMatrix in="SourceGraphic" type="matrix" values="
				2 2 2 0 0
				2 2 2 0 0
				2 2 2 0 0
				0 0 0 1 0"
			/>
		</filter>`)

		if (this.style) svg.insertAdjacentHTML('afterbegin', `<style>\n${this.style.join('\n')}\n</style>`);
		svg.append(this.node);
		if (this.script) svg.insertAdjacentHTML('beforeend', `<script>\n${this.script.join('\n')}\n</script>`);

		setAttributes(svg, {
			style: `width:100%; height:auto; max-width:${bbox.width}px;`,
			version: '1.1',
			xmlns: 'http://www.w3.org/2000/svg'
		});
		svg.setAttribute('viewBox', bbox.viewBox);
		return svg.outerHTML;
	}
	addScript(...scripts: string[]) {
		this.script.push(...scripts);
	}
	addStyle(...styles: string[]) {
		this.style.push(...styles);
	}
	appendGroup() {
		let group = new Canvas();
		this.#append(group.node);
		this.subGroups.push(group);
		return group;
	}
	drawRect(rect: RectType, style: Style): SVGElement {
		let node = this.#appendElement('rect');
		setAttributes(node, { x: rect[0], y: rect[1], width: rect[2], height: rect[3] });
		setStyle(node, style);
		this.bbox.includeRect(rect);
		return node;
	}
	drawCircle(pos: PointType, radius: number, style: Style): SVGElement {
		let node = this.#appendElement('circle');
		setAttributes(node, { cx: pos[0], cy: pos[1], r: radius });
		setStyle(node, style);
		this.bbox.includeRect([pos[0] - radius, pos[1] - radius, radius * 2, radius * 2]);
		return node;
	}
	drawText(rect: RectType, text: string, style: Style): SVGElement {
		let node = this.#appendElement('text');
		setAttributes(node, { x: rect[0] + rect[2] / 2, y: rect[1] + rect[3] / 2 });
		setStyle(node, style);
		setAttributes(node, { alignmentBaseline: 'central', textAnchor: 'middle' });
		node.textContent = text;
		this.bbox.includeRect(rect);
		return node;
	}
	drawLine(p1: PointType, p2: PointType, style: Style): SVGElement {
		let node = this.#appendElement('line');
		setAttributes(node, { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] });
		setStyle(node, style);
		this.bbox.includePoint(p1);
		this.bbox.includePoint(p2);
		return node;
	}
	drawFlowBox(rect: RectType, style: Style): SVGElement {
		let node = this.#appendElement('path');
		let x0 = rect[0];
		let x1 = rect[0] + rect[3] / 2;
		let x2 = rect[0] + rect[2];
		let x3 = rect[0] + rect[2] + rect[3] / 2;
		let y0 = rect[1];
		let y1 = rect[1] + rect[3] / 2;
		let y2 = rect[1] + rect[3];

		let d = `M${x0},${y0}L${x1},${y1}L${x0},${y2}L${x2},${y2}L${x3},${y1}L${x2},${y0}z`
		setAttributes(node, { d });
		setStyle(node, style);
		this.bbox.includeRect([rect[0], rect[1], rect[2] + rect[3] / 2, rect[3]]);
		return node;
	}
	drawPath(d: string, style: Style): SVGElement {
		let node = this.#appendElement('path');
		setAttributes(node, { d });
		setStyle(node, style);
		return node;
	}
	drawArrowHead(point: PointType, dir: PointType, style: Style): SVGElement {
		let node = this.#appendElement('path');
		let a = 0.4;
		let p1 = [point[0] + dir[0] - dir[1] * a, point[1] + dir[1] + dir[0] * a];
		let p2 = [point[0] + dir[0] + dir[1] * a, point[1] + dir[1] - dir[0] * a];
		let d = `M${point.join(',')}L${p1[0]},${p1[1]}L${p2[0]},${p2[1]}z`;

		setAttributes(node, { d });
		setStyle(node, style);
		return node;
	}
	setOpacity(opacity: string) {
		setStyle(this.node, { opacity });
	}
	#append(node: SVGElement): SVGElement {
		this.node.append(node);
		return node;
	}
	#appendElement(tagName: string): SVGElement {
		return this.#append(getElement(tagName));
	}
}

function getElement(tagName: string): SVGElement {
	return document.createElementNS('http://www.w3.org/2000/svg', tagName) as SVGElement;
}

function setAttributes(node: SVGElement, attributeObj: Record<string, string | null | number>) {
	for (let key in attributeObj) {
		let name = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
		let value = attributeObj[key];
		if (value == null) {
			node.removeAttribute(name);
		} else {
			node.setAttribute(name, String(value));
		}
	}
}

function setStyle(node: SVGElement, styleObj: Style) {
	for (let key in styleObj) {
		const value = styleObj[key];
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style[key] = value;
		}
	}
}
