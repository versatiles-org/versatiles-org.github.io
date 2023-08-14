import { BBox } from "./bbox.js";
import { JSDOM } from 'jsdom';

const { document } = (new JSDOM('')).window;

export class Canvas {
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
	asSVG(padding = 5, id) {
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
	addScript(...scripts) {
		this.script ??= [];
		this.script.push(...scripts);
	}
	addStyle(...styles) {
		this.style ??= [];
		this.style.push(...styles);
	}
	appendGroup() {
		let group = new Canvas();
		this.#append(group.node);
		this.subGroups.push(group);
		return group;
	}
	drawRect(rect, style) {
		let node = this.#appendElement('rect');
		setAttributes(node, { x: rect[0], y: rect[1], width: rect[2], height: rect[3] });
		setStyle(node, style);
		this.bbox.includeRect(rect);
		return node;
	}
	drawCircle(pos, radius, style) {
		let node = this.#appendElement('circle');
		setAttributes(node, { cx: pos[0], cy: pos[1], r: radius });
		setStyle(node, style);
		this.bbox.includeRect([pos[0] - radius, pos[1] - radius, radius * 2, radius * 2]);
		return node;
	}
	drawText(rect, text, style) {
		let node = this.#appendElement('text');
		setAttributes(node, { x: rect[0] + rect[2] / 2, y: rect[1] + rect[3] / 2 });
		setStyle(node, style);
		setAttributes(node, { alignmentBaseline: 'central', textAnchor: 'middle' });
		node.textContent = text;
		this.bbox.includeRect(rect);
		return node;
	}
	drawLine(p1, p2, style) {
		let node = this.#appendElement('line');
		setAttributes(node, { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] });
		setStyle(node, style);
		this.bbox.includePoint(p1);
		this.bbox.includePoint(p2);
		return node;
	}
	drawFlowBox(rect, style) {
		let node = this.#appendElement('path');
		let coords = {
			x: [rect[0], rect[0] + rect[3] / 2, rect[0] + rect[2], rect[0] + rect[2] + rect[3] / 2],
			y: [rect[1], rect[1] + rect[3] / 2, rect[1] + rect[3]]
		}

		let d = 'Mx0,y0Lx1,y1Lx0,y2Lx2,y2Lx3,y1Lx2,y0z'
			.replace(/[xy][0-9]/g, key => coords[key[0]][parseInt(key[1], 10)]);
		setAttributes(node, { d });
		setStyle(node, style);
		this.bbox.includeRect([rect[0], rect[1], rect[2] + rect[3] / 2, rect[3]]);
		return node;
	}
	drawPath(d, style) {
		let node = this.#appendElement('path');
		setAttributes(node, { d });
		setStyle(node, style);
		return node;
	}
	drawArrowHead(point, dir, style) {
		let node = this.#appendElement('path');
		let a = 0.4;
		let d1 = [dir[0] - dir[1] * a, dir[1] + dir[0] * a];
		let d2 = [dir[0] + dir[1] * a, dir[1] - dir[0] * a];
		let d = `M${point.join(',')}L${p(i => point[i] + d1[i])}L${p(i => point[i] + d2[i])}z`;

		setAttributes(node, { d });
		setStyle(node, style);
		return node;

		function p(cb) {
			return [0, 1].map(i => cb(i)).join(',');
		}
	}
	setOpacity(opacity) {
		setStyle(this.node, { opacity });
	}
	#append(node) {
		this.node.append(node);
		return node;
	}
	#appendElement(tagName) {
		return this.#append(getElement(tagName));
	}
}

function getElement(tagName) {
	return document.createElementNS('http://www.w3.org/2000/svg', tagName);
}

function setAttributes(node, attributeObj) {
	for (let key in attributeObj) {
		let name = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
		let value = attributeObj[key];
		if (value !== null) {
			node.setAttribute(name, value);
		} else {
			node.removeAttribute(name);
		}
	}
}

function setStyle(node, styleObj) {
	for (let key in styleObj) node.style[key] = styleObj[key];
}
