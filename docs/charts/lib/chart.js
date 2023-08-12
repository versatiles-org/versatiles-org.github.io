
Array.prototype.isIndexInner = function (index) { return (index > 0) && (index < this.length - 1) }

import { Canvas } from "./canvas.js";
import { Color } from "./color.js";
import { Vec } from "./vec.js";

const fontFamily = 'sans-serif';

export class Chart {
	constructor(opt = {}) {
		this.canvas = new Canvas();

		this.y0 = 0;
		this.layers = Object.fromEntries(
			'background,linesBack,boxes,linesFront,headlines,highlights'.split(',')
				.map(k => [k, this.canvas.appendGroup()])
		);

		this.colWidth = opt.colWidth || 200;
		this.colStart = opt.colStart || 180;
		this.boxWidth = opt.boxWidth || 140;
		this.boxHeight = opt.boxHeight || 40;
		this.gapHeight = opt.gapHeight || 40;
		this.backgroundColor = new Color(opt.backgroundColor || '#000');
	}

	asSVG(padding) {
		return this.canvas.asSVG(padding);
	}

	addHeadline(text) {
		this.addBreak(2);

		let group = this.layers.headlines;
		let rect = [
			this.colStart - this.colWidth / 4 - this.boxHeight / 4, this.y0,
			this.colWidth * 4.5 + this.boxHeight / 2, this.boxHeight
		];
		group.drawRect(rect, { fill: '#FFFA' });
		group.drawText(rect, text, { fontColor: '#000', fontFamily, fontSize: this.boxHeight / 2 + 'px' });
		this.y0 += this.boxHeight;

		this.addBreak();
	}

	addBreak(count = 1) {
		this.y0 += this.gapHeight * count;
	}

	addFlow() {
		let x0 = 0, y0 = this.y0, colIndex = 0;

		this.y0 += this.boxHeight;
		this.flowYMax = this.y0;

		let group = this.layers.boxes;
		group.add = (text, highlight, end) => {
			let width = end
				? this.colStart - this.colWidth / 4 - this.boxHeight / 4
				: this.colWidth / 2;

			highlight ??= (colIndex % 2 === 1);

			let color = highlight ? '#F10' : '#666';
			let rect = [x0, y0, width, this.boxHeight];
			group.drawFlowBox(rect, {
				strokeWidth: highlight ? 1 : 0,
				stroke: color,
				fill: color + '5',
			});
			rect[0] += this.boxHeight / 3;
			group.drawText(rect, text, { fill: color, fontFamily, fontSize: '13px' });

			x0 += width;
			colIndex++;

			return group;
		}

		return group;
	}

	addCover(type, name, connections, col) {
		this.coverColY ??= Array.from({ length: 5 }, i => this.y0);
		this.coverConY ??= Array.from({ length: 5 }, i => this.y0);

		col ??= connections[0];
		let [color] = this.#getType(type);

		let con0 = Math.min(...connections);
		let con1 = Math.max(...connections);
		let gapHeight = 20;

		// prevent this box from overlapping with an existing box:
		let boxY = this.coverColY[col];
		// prevent the connection line from overlapping with existing boxes:
		for (let i = con0; i < con1; i++) boxY = Math.max(boxY, this.coverColY[i] - this.boxHeight / 2);
		// prevent the connection line from overlapping with existing lines:
		for (let i = con0; i <= con1; i++) boxY = Math.max(boxY, this.coverConY[i] - this.boxHeight / 2);

		let conY = boxY + this.boxHeight / 2;

		// set min start position for this column:
		this.coverColY[col] = boxY + this.boxHeight + gapHeight;
		// set min start position for columns with connection line:
		for (let i = con0; i < con1; i++) this.coverColY[i] = Math.max(this.coverColY[i], conY + gapHeight);
		// set min start position for axes with connection line:
		for (let i = con0; i <= con1; i++) this.coverConY[i] = Math.max(this.coverConY[i], conY + 30);

		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer([x, boxY], type, name);

		connections.forEach(c => {
			let x = this.colStart + c * this.colWidth;
			this.layers.linesFront.drawCircle([x, conY], 5, { fill: color });
		})

		let cx0 = Math.min(...connections) * this.colWidth + this.colStart;
		let cx1 = Math.max(...connections) * this.colWidth + this.colStart;
		if (cx0 <= x) this.layers.linesFront.drawLine([cx0, conY], [x, conY], { stroke: color, strokeWidth: 2 });
		if (cx1 > x) this.layers.linesFront.drawLine([x + this.boxWidth, conY], [cx1, conY], { stroke: color, strokeWidth: 2 });

		this.y0 = Math.max(this.y0, boxY + this.boxHeight);

		return box;
	}

	addCoverGuides() {
		for (let i = 0; i < 5; i++) {
			let x = this.colStart + this.colWidth * i;
			this.layers.background.drawLine(
				[x, this.flowYMax],
				[x, this.y0 + this.gapHeight / 2],
				{ stroke: this.#fadeColor('#F10'), strokeWidth: 8 }
			)
		}
	}

	addDependency(type, name, col, ref, options = {}) {
		this.depColY ??= Array.from({ length: 4 }, i => this.y0);;

		if (options.dy) this.depColY[col] += options.dy;
		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer([x, this.depColY[col]], type, name);
		this.depColY[col] += this.boxHeight * 1.5;
		this.y0 = Math.max(this.y0, this.depColY[col]);

		if (ref) {
			let path = getConnectionPath(box, ref, options);
			this.layers.linesBack.drawPath(path.d, { fill: 'none', stroke: this.#fadeColor(box.color), strokeWidth: 2 })
		}

		return box;
	}

	addDepDep(dep0, dep1, options = {}) {
		options.shortenEnd = 5;
		let path = getConnectionPath(dep0, dep1, options);
		let node1 = this.layers.linesFront.drawPath(path.d, { fill: 'none', stroke: dep0.color, strokeWidth: 2 })
		let node2 = this.layers.linesFront.drawArrowHead(
			path.point1.array(),
			path.dir1.scale(10).array(),
			{ fill: dep0.color }
		)
	}

	addRepo(name, col, refs = [], options = {}) {
		this.repoColY ??= Array.from({ length: 4 }, i => this.y0);;

		if (options.dy) this.repoColY[col] += options.dy;
		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer([x, this.repoColY[col]], 'repo', name);
		this.repoColY[col] += this.boxHeight * 1.5;
		this.y0 = Math.max(this.y0, this.depColY[col]);

		let color = this.#fadeColor(box.color);

		box.addLink = (ref, opt = {}) => {
			opt.endArrow ??= true;

			if (opt.endArrow) opt.shortenEnd = 4;

			let path = getConnectionPath(box, ref, opt);
			this.layers.linesBack.drawPath(path.d, { fill: 'none', stroke: color, strokeWidth: 1 })
			if (opt.endArrow) {
				this.layers.linesFront.drawArrowHead(
					path.point1.array(),
					path.dir1.scale(8).array(),
					{ fill: color }
				)
			};
			return box;
		}

		return box;
	}

	addHover(groupEvent, groupRef) {

	}

	#getType(type) {
		switch (type) {
			case 'docker': return ['#08C', 'Docker Container'];
			case 'rust': return ['#0C4', 'Rust Package'];
			case 'node': return ['#0C8', 'NPM Package'];
			case 'file': return ['#CC0', 'File'];
			case 'repo': return ['#AAA', 'GitHub Repository'];
			default: throw Error(type);
		}
	}

	#drawContainer(pos, type, name) {
		const headerHeight = 13;
		const group = this.layers.boxes.appendGroup();
		let [color, title] = this.#getType(type);
		let darkColor = this.#fadeColor(color);

		const rect = [pos[0], pos[1], this.boxWidth, this.boxHeight];
		const rectText = [pos[0], pos[1] + headerHeight, this.boxWidth, this.boxHeight - headerHeight];
		const rectHead = [pos[0], pos[1], this.boxWidth, headerHeight]
		group.drawRect(rect, { fill: darkColor, stroke: color, cursor: 'pointer' });
		group.drawText(rectText, name, { fill: color, fontFamily, fontSize: '13px', pointerEvents: 'none' });
		group.drawRect(rectHead, { fill: color, pointerEvents: 'none' });
		group.drawText(rectHead, title, { fill: darkColor, fontWeight: 'bold', fontFamily, fontSize: '10px', pointerEvents: 'none' });

		const overlay = [];
		group.node.addEventListener('mouseover', () => {
			console.log(neighborhood);
			neighborhood.forEach(n => n.setAttribute('filter', 'url(#highlight)'))
		});
		group.node.addEventListener('mouseout', () => {
			neighborhood.forEach(n => n.setAttribute('filter', ''))
		});

		return { rect, color, overlay };
	}

	#fadeColor(color) {
		return new Color(color).fadeTo(this.backgroundColor, 2 / 3).toString();
	}
}

function getConnectionPath(box0, box1, opt = {}) {
	opt.shortenStart ??= 0;
	opt.shortenEnd ??= 0;
	opt.offset ??= 15;
	opt.radius ??= 10;

	let size0 = new Vec(box0.rect[2], box0.rect[3]).scale(0.5);
	let size1 = new Vec(box1.rect[2], box1.rect[3]).scale(0.5);

	let center0 = new Vec(box0.rect[0], box0.rect[1]).add(size0);
	let center1 = new Vec(box1.rect[0], box1.rect[1]).add(size1);

	let dir0 = center0.getDirection(center1).snapToAxis().normalize();
	let dir1 = dir0.clone().scale(-1);

	if (opt.startDir) dir0 = Vec.fromChar(opt.startDir);
	if (opt.endDir) dir1 = Vec.fromChar(opt.endDir);

	let distance0 = Math.abs(dir0.scalar(size0));
	let distance1 = Math.abs(dir1.scalar(size1));

	let contact0 = center0.clone().addScaled(dir0, distance0);
	let contact1 = center1.clone().addScaled(dir1, distance1);

	if (opt.startContactShift) contact0.addScaled(dir0.getRotated90(), opt.startContactShift);
	if (opt.endContactShift) contact1.addScaled(dir1.getRotated90(), opt.endContactShift);

	let start0 = contact0.clone().addScaled(dir0, opt.shortenStart || 0);
	let start1 = contact1.clone().addScaled(dir1, opt.shortenEnd || 0);

	let result = {
		point0: contact0, dir0,
		point1: contact1, dir1
	};


	if (dir0.isOpposite(dir1)) {
		// Enden zeigen aufeinander
		if (contact0.getDirection(contact1).isEqual(dir0)) {
			// direkte Linie
			return { ...result, d: makePath(start0, start1) }
		} else {
			// Linie, mit zwei Knicks, macht also Zick-Zack
			let m = contact0.getMiddle(contact1);
			if (opt.endOffset) m = contact1.clone().addScaled(dir1, opt.endOffset);
			if (dir0.isHorizontal()) {
				return { ...result, d: makePath(start0, start0.getWithX(m.x), start1.getWithX(m.x), start1) }
			} else if (dir0.isVertical()) {
				return { ...result, d: makePath(start0, start0.getWithY(m.y), start1.getWithY(m.y), start1) }
			} else {
				throw Error();
			}
		}
	}

	if (dir0.isEqual(dir1)) {
		// Enden zeigen gegeneinander, Pfad macht also einen 180° Bogen.

		if (dir0.isHorizontal()) {
			let x;
			if (dir0.x > 0) {
				x = Math.max(contact0.x, contact1.x) + opt.offset;
			} else {
				x = Math.min(contact0.x, contact1.x) - opt.offset;
			}
			return { ...result, d: makePath(start0, start0.getWithX(x), start1.getWithX(x), start1) }
		} else if (dir0.isVertical()) {
			let y;
			if (dir0.y > 0) {
				y = Math.max(contact0.y, contact1.y) + opt.offset;
			} else {
				y = Math.min(contact0.y, contact1.y) - opt.offset;
			}
			return { ...result, d: makePath(start0, start0.getWithY(y), start1.getWithY(y), start1) }
		} else {
			throw Error();
		}
	}

	if (dir0.isOrthogonal(dir1)) {
		let k = dir0.x * dir1.y - dir0.y * dir1.x;
		let l = dir1.y * (contact1.x - contact0.x) - dir1.x * (contact1.y - contact0.y);
		let corner = new Vec(contact0.x * k + dir0.x * l, contact0.y * k + dir0.y * l);
		return { ...result, d: makePath(start0, corner, start1) };
	}

	console.log({ dir0, dir1, contact0, contact1 })
	throw Error();

	function makePath(...points) {
		let radius = opt.radius;
		return points.map((p1, i) => {
			if (i === 0) return 'M' + p1.str();
			if (i === points.length - 1) return 'L' + p1.str();

			let p0 = points[i - 1];
			let p2 = points[i + 1];

			let c0 = p1.getTowards(p0, radius);
			let c2 = p1.getTowards(p2, radius);

			let d1 = p0.getDirection(p1);
			let d2 = p1.getDirection(p2);
			let angle = d1.getAngleTo(d2);
			return [
				'L' + c0.str(),
				'A' + [radius, radius, 0, 0, angle > 0 ? 0 : 1, c2.str()].join(',')
			].join('')
		}).join('');
	}
}
