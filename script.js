
EventTarget.prototype.on = function (type, callback) { this.addEventListener(type, callback) }
Array.prototype.isIndexInner = function (index) { return (index > 0) && (index < this.length - 1) }

class BBox {
	constructor(bbox) {
		this.bbox = bbox ? bbox.slice() : [
			Number.POSITIVE_INFINITY,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
			Number.NEGATIVE_INFINITY
		]
	}
	get width() {
		return this.bbox[2] - this.bbox[0]
	}
	get height() {
		return this.bbox[3] - this.bbox[1]
	}
	asAttributes() {
		return {
			width: this.bbox[2],
			height: this.bbox[3],
			viewBox: [0, 0, this.bbox[2], this.bbox[3]].join(' ')
		}
	}
	includeRect(rect) {
		this.#include([rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]])
	}
	includePoint(p) {
		this.#include([p[0], p[1], p[0], p[1]])
	}
	#include(bbox) {
		if (this.bbox[0] > bbox[0]) this.bbox[0] = bbox[0];
		if (this.bbox[1] > bbox[1]) this.bbox[1] = bbox[1];
		if (this.bbox[2] < bbox[2]) this.bbox[2] = bbox[2];
		if (this.bbox[3] < bbox[3]) this.bbox[3] = bbox[3];
	}
	includeBBox(other) {
		this.#include(other.bbox);
	}
	clone() {
		return new BBox(this.bbox);
	}
}

class Canvas {
	constructor() {
		this.node = this.#getElement('g');
		this.bbox = new BBox();
		this.subGroups = [];
	}
	getBBox() {
		let bbox = this.bbox.clone();
		this.subGroups.forEach(g => bbox.includeBBox(g.getBBox()));
		return bbox;
	}
	asSVG() {
		let svg = this.#getElement('svg');
		let bbox = this.getBBox();
		this.#setAttributes(svg, bbox.asAttributes());
		svg.append(this.node);
		return svg;
	}
	appendGroup() {
		let group = new Canvas();
		this.#append(group.node);
		this.subGroups.push(group);
		return group;
	}
	drawRect(rect, style) {
		let node = this.#appendElement('rect');
		this.#setAttributes(node, { x: rect[0], y: rect[1], width: rect[2], height: rect[3] });
		this.#setStyle(node, style);
		this.bbox.includeRect(rect);
	}
	drawCircle(pos, radius, style) {
		let node = this.#appendElement('circle');
		this.#setAttributes(node, { cx: pos[0], cy: pos[1], r: radius });
		this.#setStyle(node, style);
		this.bbox.includeRect([pos[0] - radius, pos[1] - radius, radius * 2, radius * 2]);
	}
	drawText(rect, text, style) {
		let node = this.#appendElement('text');
		this.#setAttributes(node, { x: rect[0] + rect[2] / 2, y: rect[1] + rect[3] / 2 });
		this.#setStyle(node, style);
		this.#setAttributes(node, { alignmentBaseline: 'middle', textAnchor: 'middle' });
		node.textContent = text;
		this.bbox.includeRect(rect);
	}
	drawLine(p1, p2, style) {
		let node = this.#appendElement('line');
		this.#setAttributes(node, { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] });
		this.#setStyle(node, style);
		this.bbox.includePoint(p1);
		this.bbox.includePoint(p2);
	}
	drawFlowBox(rect, style) {
		let node = this.#appendElement('path');
		let coords = {
			x: [rect[0], rect[0] + rect[3] / 2, rect[0] + rect[2], rect[0] + rect[2] + rect[3] / 2],
			y: [rect[1], rect[1] + rect[3] / 2, rect[1] + rect[3]]
		}

		let d = 'Mx0,y0Lx1,y1Lx0,y2Lx2,y2Lx3,y1Lx2,y0z'
			.replace(/[xy][0-9]/g, key => coords[key[0]][parseInt(key[1], 10)]);
		this.#setAttributes(node, { d });
		this.#setStyle(node, style);
		this.bbox.includeRect([rect[0], rect[1], rect[2] + rect[3] / 2, rect[3]]);
	}
	drawPath(d, style) {
		let node = this.#appendElement('path');
		this.#setAttributes(node, { d });
		this.#setStyle(node, style);
	}
	drawArrowHead(point, dir, style) {
		let node = this.#appendElement('path');
		let a = 0.3;
		let b = Math.sqrt(1 - a * a);
		let d1 = [dir[0] * b - dir[1] * a, dir[1] * b + dir[0] * a];
		let d2 = [dir[0] * b + dir[1] * a, dir[1] * b - dir[0] * a];
		let d = `M${point.join(',')}L${p(i => point[i] + d1[i])}L${p(i => point[i] + d2[i])}z`;
		console.log(d);
		this.#setAttributes(node, { d });
		this.#setStyle(node, style);

		function p(cb) {
			return [0, 1].map(i => cb(i)).join(',');
		}
	}
	#append(node) {
		this.node.append(node);
		return node;
	}
	#appendElement(tagName) {
		return this.#append(this.#getElement(tagName));
	}
	#getElement(tagName) {
		return document.createElementNS('http://www.w3.org/2000/svg', tagName);
	}
	#setAttributes(node, attributeObj) {
		for (let key in attributeObj) {
			node.setAttribute(
				key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()),
				attributeObj[key]
			);
		}
	}
	#setStyle(node, styleObj) {
		for (let key in styleObj) node.style[key] = styleObj[key];
	}
}

const fontFamily = 'sans-serif';
class Chart {
	constructor() {
		this.y0 = 0;
		this.canvas = new Canvas();
		this.colWidth = 200;
		this.colStart = 220;
		this.boxWidth = 120;
		this.boxHeight = 40;
		this.gapHeight = 40;
	}

	asSVG() {
		return this.canvas.asSVG();
	}

	addHeadline(text) {
		this.addBreak(2);

		let group = this.canvas.appendGroup();
		let rect = [
			this.colStart - this.colWidth / 4 - this.boxHeight / 4, this.y0,
			this.colWidth * 4.5 + this.boxHeight / 2, this.boxHeight
		];
		group.drawRect(rect, { fill: '#FFFA' });
		group.drawText(rect, text, { fontColor: '#000', fontFamily, fontSize: this.boxHeight / 2 });
		this.y0 += this.boxHeight;

		this.addBreak();
	}

	addBreak(count = 1) {
		this.y0 += this.gapHeight * count;
	}

	addFlow(elements) {
		let x0 = 0;
		let group = this.canvas.appendGroup();
		elements.forEach((text, i) => {
			let width =
				elements.isIndexInner(i)
					? this.colWidth / 2
					: this.colStart - this.colWidth / 4 - this.boxHeight / 4;

			let color = (i % 2 === 0) ? '#666' : '#F10';
			let rect = [x0, this.y0, width, this.boxHeight];
			x0 += width;
			group.drawFlowBox(rect, {
				strokeWidth: (i % 2 === 0) ? 0 : 1,
				stroke: color,
				fill: color + '5',
			});
			rect[0] += this.boxHeight / 3;
			group.drawText(rect, text, { fill: color, fontFamily, fontSize: this.boxHeight / 3 });
		})
		this.y0 += this.boxHeight;
		this.flowYMax = this.y0;
		this.guideGroup = this.canvas.appendGroup();
		return group;
	}

	addCover(type, name, connections, position) {
		this.coverGroup ??= this.canvas.appendGroup();
		this.coverLastPosition ??= -3.1;

		position ??= connections[0];
		if (position === this.coverLastPosition) this.y0 += this.boxHeight / 2;
		this.coverLastPosition = position;

		let [color, title] = this.#getType(type);

		let cy = this.y0 + this.boxHeight / 2;

		connections.forEach(c => {
			let x = this.colStart + c * this.colWidth;
			this.coverGroup.drawCircle([x, cy], 5, { fill: color });
		})

		let x = this.colStart + (position + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer(this.coverGroup, [x, this.y0], type, name);

		let cx0 = Math.min(...connections) * this.colWidth + this.colStart;
		let cx1 = Math.max(...connections) * this.colWidth + this.colStart;
		if (cx0 <= x) this.coverGroup.drawLine([cx0, cy], [x, cy], { stroke: color, strokeWidth: 2 });
		if (cx1 > x) this.coverGroup.drawLine([x + this.boxWidth, cy], [cx1, cy], { stroke: color, strokeWidth: 2 });

		this.y0 += this.boxHeight;

		return box;
	}

	addCoverGuides() {
		for (let i = 0; i < 5; i++) {
			let x = this.colStart + this.colWidth * i;
			this.guideGroup.drawLine(
				[x, this.flowYMax],
				[x, this.y0 + this.gapHeight],
				{ stroke: '#F105', strokeWidth: 5 }
			)
		}
	}

	addDependency(type, name, col, ref) {
		this.dependencyGroup ??= this.canvas.appendGroup();
		this.depColY ??= [this.y0, this.y0, this.y0, this.y0];

		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer(this.dependencyGroup, [x, this.depColY[col]], type, name);
		this.depColY[col] += this.boxHeight * 1.5;

		if (ref) {
			let path = this.#getPath(ref, box);
			this.dependencyGroup.drawPath(path.d, { stroke: box.color + '5', strokeWidth: 1 })
		}

		return box;
	}

	addDepDep(dep0, dep1, options) {
		let path = this.#getPath(dep0, dep1, options);
		this.dependencyGroup.drawPath(path.d, { stroke: dep0.color, strokeWidth: 2 })
		this.dependencyGroup.drawArrowHead(path.point1, path.dir1.map(v => 20 * v), { fill: dep0.color })
	}

	#getType(type) {
		switch (type) {
			case 'docker': return ['#00F', 'Docker Container'];
			case 'rust': return ['#0AF', 'Rust Package'];
			case 'npm': return ['#0FF', 'NPM Package'];
			case 'file': return ['#0FA', 'File'];
			default: throw Error(type);
		}
	}

	#getPath(box0, box1, options) {
		let s0 = [box0.rect[2] / 2, box0.rect[3] / 2];
		let s1 = [box1.rect[2] / 2, box1.rect[3] / 2];
		let p0 = [box0.rect[0] + s0[0], box0.rect[1] + s0[1]];
		let p1 = [box1.rect[0] + s1[0], box1.rect[1] + s1[1]];
		let dx = p0[0] - p1[0];
		let dy = p0[1] - p1[1];
		let dir0;
		if (Math.abs(dx) > Math.abs(dy)) {
			dir0 = (dx < 0) ? [1, 0] : [-1, 0];
		} else {
			dir0 = (dy < 0) ? [0, 1] : [0, -1];
		}
		let dir1 = dir0.map(v => -v);


		let point0 = p(i => p0[i] + s0[i] * dir0[i]);
		let point1 = p(i => p1[i] + s1[i] * dir1[i]);
		return {
			point0, dir0,
			point1, dir1,
			d: 'M' + point0.join(',') + 'L' + point1.join(',')
		};

		function p(cb) {
			return [0, 1].map(i => cb(i));
		}
	}

	#drawContainer(canvas, pos, type, name) {
		let [color, title] = this.#getType(type);

		let head = [pos[0], pos[1], this.boxWidth, 10]
		canvas.drawRect(head, { fill: color });
		canvas.drawText(head, title, { fill: '#000A', fontFamily, fontSize: 7 });

		let rect = [pos[0], pos[1], this.boxWidth, this.boxHeight];
		canvas.drawRect(
			rect,
			{ fill: color + '5', stroke: color }
		);

		canvas.drawText(
			[pos[0], pos[1] + 10, this.boxWidth, this.boxHeight - 10], name,
			{ fill: color, fontFamily, fontSize: this.boxHeight / 3 }
		);

		return { rect, color };
	}
}
