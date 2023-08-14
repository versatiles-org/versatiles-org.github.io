
import { Canvas } from "./canvas.js";
import { Color } from "./color.js";
import { Vec } from "./vec.js";

const fontFamily = 'sans-serif';

export class Chart {
	constructor(opt = {}) {
		this.canvas = new Canvas();
		this.id = 'svg' + Math.random().toString(36).slice(2);

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
		return this.canvas.asSVG(padding, this.id);
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
		let box = this.#drawBox([x, boxY], type, name);

		let conBox = this.layers.linesFront.appendGroup();

		connections.forEach(c => {
			let x = this.colStart + c * this.colWidth;
			conBox.drawCircle([x, conY], 5, { fill: color });
		})

		let cx0 = Math.min(...connections) * this.colWidth + this.colStart;
		let cx1 = Math.max(...connections) * this.colWidth + this.colStart;
		if (cx0 <= x) conBox.drawLine([cx0, conY], [x, conY], { stroke: color, strokeWidth: 2 });
		if (cx1 > x) conBox.drawLine([x + this.boxWidth, conY], [cx1, conY], { stroke: color, strokeWidth: 2 });

		this.y0 = Math.max(this.y0, boxY + this.boxHeight);
		box.connections.push([box, conBox]);
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

	addDependency(type, name, col, options = {}) {
		this.depColY ??= Array.from({ length: 4 }, i => this.y0);;

		if (options.dy) this.depColY[col] += options.dy;
		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawBox([x, this.depColY[col]], type, name);
		this.depColY[col] += this.boxHeight * 1.5;
		this.y0 = Math.max(this.y0, this.depColY[col]);

		box.linkCov = (cov, options = {}) => {
			let path = getConnectionPath(box, cov, options);
			let conBox = this.layers.linesBack.appendGroup();
			conBox.setOpacity(0.3);
			conBox.drawPath(path.d, { fill: 'none', stroke: box.color, strokeWidth: 2 })
			box.connections.push([cov, conBox]);
			return box
		}

		box.linkDep = (dep, options = {}) => {
			options.gap1 = 5;
			let path = getConnectionPath(box, dep, options);
			let conBox = this.layers.linesFront.appendGroup();
			conBox.drawPath(path.d, { fill: 'none', stroke: box.color, strokeWidth: 2 })
			conBox.drawArrowHead(
				path.point1.array(),
				path.dir1.scale(10).array(),
				{ fill: box.color }
			)
			box.connections.push([dep, conBox]);
			return box
		}

		return box;
	}

	addRepo(name, col, options = {}) {
		this.repoColY ??= Array.from({ length: 4 }, i => this.y0);;

		if (options.dy) this.repoColY[col] += options.dy;
		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawBox([x, this.repoColY[col]], 'repo', name);
		this.repoColY[col] += this.boxHeight * 1.5;
		this.y0 = Math.max(this.y0, this.depColY[col]);

		box.link = (ref, opt = {}) => {
			opt.endArrow ??= true;

			if (opt.endArrow) opt.gap1 = 4;

			let path = getConnectionPath(box, ref, opt);
			let conBox = this.layers.linesBack.appendGroup();
			conBox.setOpacity(0.3);
			conBox.drawPath(path.d, { fill: 'none', stroke: box.color, strokeWidth: 1 });
			if (opt.endArrow) {
				conBox.drawArrowHead(
					path.point1.array(),
					path.dir1.scale(8).array(),
					{ fill: box.color }
				)
			}
			box.connections.push([ref, conBox]);
			return box;
		}

		return box;
	}

	addHover(hoverList, refList) {
		this.hoverCount ??= 1;

		const idx = this.hoverCount

		if (idx === 1) {
			this.canvas.addScript(`
			const g = document.getElementById('${this.id}');
			function show(id) { g.classList.add('show', 'show'+id) }
			function hide(id) { g.classList.remove('show', 'show'+id) }
			`)
			this.canvas.addStyle(`#${this.id} .obj { transition: opacity 0.1s 0.1s; }`);
			this.canvas.addStyle(`#${this.id}.show .obj { transition: opacity 0.1s; opacity: 0.3; }`);
		}
		this.canvas.addStyle(`#${this.id}.show${idx} .obj${idx} { opacity: 1 !important; }`);

		hoverList.forEach(box => {
			if (box.node.onmouseover) throw Error('event already exists');
			box.node.setAttribute('onmouseover', `show(${idx})`);
			box.node.setAttribute('onmouseout', `hide(${idx})`);
		});

		let highlightList = [].concat(hoverList, refList || []);
		let hoverSet = new Set(hoverList)
		let highlightSet = new Set(highlightList)
		highlightList.forEach(box => {
			box.node.classList.add('obj', `obj${idx}`)
			box.connections.forEach(([ref, conBox]) => {
				if (hoverSet.has(ref)) conBox.node.classList.add('obj', `obj${idx}`)
			})
		});
		hoverList.forEach(box => {
			box.connections.forEach(([ref, conBox]) => {
				if (highlightSet.has(ref)) conBox.node.classList.add('obj', `obj${idx}`)
			})
		});
		this.hoverCount++;
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

	#drawBox(pos, type, name) {
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

		let box = { rect, color, node: group.node, connections: [] };

		return box;
	}

	#fadeColor(color) {
		return new Color(color).fadeTo(this.backgroundColor, 2 / 3).toString();
	}
}

function getConnectionPath(box0, box1, opt = {}) {
	opt.gap0 ??= 0;
	opt.gap1 ??= 0;

	opt.offset ??= 20;
	opt.edgeRadius ??= 6;

	let size0 = new Vec(box0.rect[2], box0.rect[3]).scale(0.5);
	let size1 = new Vec(box1.rect[2], box1.rect[3]).scale(0.5);

	let center0 = new Vec(box0.rect[0], box0.rect[1]).add(size0);
	let center1 = new Vec(box1.rect[0], box1.rect[1]).add(size1);

	let dir0 = center0.getDirection(center1).snapToAxis().normalize();
	let dir1 = dir0.clone().scale(-1);

	if (opt.dir0) dir0 = Vec.fromChar(opt.dir0);
	if (opt.dir1) dir1 = Vec.fromChar(opt.dir1);

	let contact0 = center0.clone().addScaled(dir0, Math.abs(dir0.scalar(size0)));
	let contact1 = center1.clone().addScaled(dir1, Math.abs(dir1.scalar(size1)));

	if (opt.contactShift0) contact0.addScaled(dir0.getRotated90(), opt.contactShift0);
	if (opt.contactShift1) contact1.addScaled(dir1.getRotated90(), opt.contactShift1);

	let start0 = contact0.clone().addScaled(dir0, opt.offset0 || opt.offset);
	let start1 = contact1.clone().addScaled(dir1, opt.offset1 || opt.offset);

	let point0 = contact0.clone();
	let point1 = contact1.clone();
	if (opt.gap0) contact0.addScaled(dir0, opt.gap0);
	if (opt.gap1) contact1.addScaled(dir1, opt.gap1);

	let pointDirs = [];
	pointDirs.push([contact0, dir0], [start0, dir0]);
	if (opt.points) opt.points.forEach(p => pointDirs.push(processPoint(p, start0, start1)));
	pointDirs.push([start1, dir1], [contact1, dir1]);

	let points = addMissingPoints(pointDirs);
	points = deleteUselessPoints(points);

	let d = makePath(points);

	return {
		point0, dir0,
		point1, dir1,
		d,
	}

	function processPoint(s, p0, p1) {
		s = s.replace(/x0/g, p0.x);
		s = s.replace(/y0/g, p0.y);
		s = s.replace(/x1/g, p1.x);
		s = s.replace(/y1/g, p1.y);
		s = s.replace(/xc/g, (p0.x + p1.x) / 2);
		s = s.replace(/yc/g, (p0.y + p1.y) / 2);
		s = eval('[' + s + ']');
		if (s.length !== 4) throw Error();
		return [new Vec(s[0], s[1]), new Vec(s[2], s[3])];
	}

	function makePath(points) {
		let radius = opt.edgeRadius;
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

	function addMissingPoints(pointDirs) {
		if (pointDirs.length < 4) throw Error();
		let points = [];
		for (let i = 0; i < pointDirs.length; i++) {
			points.push(pointDirs[i][0]);
			if (i < pointDirs.length - 1) {
				checkForMissingPoints(
					pointDirs[i][0], pointDirs[i][1],
					pointDirs[i + 1][0], pointDirs[i + 1][1]
				)
			}
		}
		return points;

		function checkForMissingPoints(p0, d0, p1, d1) {
			if (p0.x === p1.x) return;
			if (p0.y === p1.y) return;
			if (d0.isOpposite(d1)) {
				if (d0.isVertical() && d1.isVertical()) {
					let y = (p0.y + p1.y) / 2;
					return points.push(p0.getWithY(y), p1.getWithY(y));
				}
				if (d0.isHorizontal() && d1.isHorizontal()) {
					let x = (p0.x + p1.x) / 2;
					return points.push(p0.getWithX(x), p1.getWithX(x));
				}
			}
			if (d0.isOrthogonal(d1)) {
				if (d0.isHorizontal()) {
					return points.push(p0.getWithX(p1.x));
				} else {
					return points.push(p0.getWithY(p1.y));
				}
			}
			if (d0.isEqual(d1)) {
				switch (d0.getChar()) {
					case 'N': {
						let y = Math.min(p0.y, p1.y);
						return points.push(p0.getWithY(y), p1.getWithY(y));
					}
					case 'S': {
						let y = Math.max(p0.y, p1.y);
						return points.push(p0.getWithY(y), p1.getWithY(y));
					}
					case 'W': {
						let x = Math.min(p0.x, p1.x);
						return points.push(p0.getWithX(x), p1.getWithX(x));
					}
					case 'E': {
						let x = Math.max(p0.x, p1.x);
						return points.push(p0.getWithX(x), p1.getWithX(x));
					}
				}
			}
			console.log({ p0, d0, p1, d1 });
			throw Error();
		}
	}

	function deleteUselessPoints(points) {
		for (let i = 1; i < points.length - 1; i++) {
			let p0 = points[i - 1];
			let p1 = points[i];
			let p2 = points[i + 1];
			if (((p0.x === p1.x) && (p1.x === p2.x)) || ((p0.y === p1.y) && (p1.y === p2.y))) {
				points.splice(i, 1);
				i--;
			}
		}
		return points;
	}
}
