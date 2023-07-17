import { Canvas } from "./canvas.js";

const fontFamily = 'sans-serif';

export class Chart {
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
			group.drawText(rect, text, { fill: color, fontFamily, fontSize: 12 });
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

	addDependency(type, name, col, ref, options = {}) {
		this.dependencyGroup ??= this.canvas.appendGroup();
		this.depColY ??= [this.y0, this.y0, this.y0, this.y0];

		if (options.dy) this.depColY[col] += options.dy;
		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer(this.dependencyGroup, [x, this.depColY[col]], type, name);
		this.depColY[col] += this.boxHeight * 1.5;
		this.y0 = Math.max(this.y0, this.depColY[col]);

		if (ref) {
			let path = this.#getPath(ref, box, options);
			this.dependencyGroup.drawPath(path.d, { fill: 'none', stroke: box.color + '5', strokeWidth: 1 })
		}

		return box;
	}

	addDepDep(dep0, dep1, options = {}) {
		options.shortenEnd = 5;
		let path = this.#getPath(dep0, dep1, options);
		this.dependencyGroup.drawPath(path.d, { fill: 'none', stroke: dep0.color, strokeWidth: 2 })
		this.dependencyGroup.drawArrowHead(
			path.point1.array(),
			path.dir1.scale(10).array(),
			{ fill: dep0.color }
		)
	}

	addRepo(name, col, refs = [], options = {}) {
		this.repoGroup ??= this.canvas.appendGroup();
		this.repoColY ??= [this.y0, this.y0, this.y0, this.y0];

		if (options.dy) this.repoColY[col] += options.dy;
		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer(this.repoGroup, [x, this.repoColY[col]], 'repo', name);
		this.repoColY[col] += this.boxHeight * 1.5;
		this.y0 = Math.max(this.y0, this.depColY[col]);

		refs.forEach(ref => {
			let path = this.#getPath(ref, box, options);
			this.repoGroup.drawPath(path.d, { fill: 'none', stroke: box.color + 'A', strokeWidth: 1 })
		})

		return box;
	}

	#getType(type) {
		switch (type) {
			case 'docker': return ['#00F', 'Docker Container'];
			case 'rust': return ['#0AF', 'Rust Package'];
			case 'npm': return ['#0FF', 'NPM Package'];
			case 'file': return ['#0FA', 'File'];
			case 'repo': return ['#AAA', 'GitHub Repository'];
			default: throw Error(type);
		}
	}

	#getPath(box0, box1, opt = {}) {
		opt.shortenStart ??= 0;
		opt.shortenEnd ??= 0;
		opt.offset ??= 20;
		opt.radius ??= 0;

		let size0 = new Vec(box0.rect[2], box0.rect[3]).scale(0.5);
		let size1 = new Vec(box1.rect[2], box1.rect[3]).scale(0.5);

		let center0 = new Vec(box0.rect[0], box0.rect[1]).add(size0);
		let center1 = new Vec(box1.rect[0], box1.rect[1]).add(size1);

		let dir0 = center0.getDirection(center1).orthogonalize().normalize();
		let dir1 = dir0.clone().scale(-1);

		if (opt.startDir) dir0 = Vec.fromChar(opt.startDir);
		if (opt.endDir) dir1 = Vec.fromChar(opt.endDir);

		let distance0 = Math.abs(dir0.scalar(size0));
		let distance1 = Math.abs(dir1.scalar(size1));

		let contact0 = center0.clone().addScaled(dir0, distance0);
		let contact1 = center1.clone().addScaled(dir1, distance1);

		let start0 = center0.clone().addScaled(dir0, distance0 + (opt.shortenStart || 0));
		let start1 = center1.clone().addScaled(dir1, distance1 + (opt.shortenEnd || 0));

		let result = {
			point0: contact0, dir0,
			point1: contact1, dir1
		};
		//console.log({ center0, dir0, size0, contact0 });

		if (contact0.getDirection(contact1).isOrthogonal()) {
			return { ...result, d: 'M' + start0.str() + 'L' + start1.str() }
		}

		let connnection0 = start0.clone().addScaled(dir0, opt.offset);
		let connnection1 = start1.clone().addScaled(dir1, opt.offset);

		return { ...result, d: 'M' + contact0.str() + 'L' + contact1.str() }
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
			{ fill: color, fontFamily, fontSize: 12 }
		);

		return { rect, color };
	}
}
/*
class Direction {
	constructor(input) {
		if (Array.isArray(input)) {
			this.x = input[0];
			this.y = input[1];
			return
		} else if (typeof input === 'string') {
			// compass
			throw Error();

			function dirLookup(text) {
				switch (text.toUpperCase()) {
					case 'N': return [0, -1];
					case 'S': return [0, 1];
					case 'W': return [-1, 0];
					case 'E': return [1, 0];
					default: throw Error();
				}
			}
		}
		throw Error();
	}
	add(point) {
		this.x += point.x;
		this.y += point.y;
		return this;
	}
}*/

class Vec {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	clone() {
		return new Vec(this.x, this.y);
	}
	add(vec) {
		this.x += vec.x;
		this.y += vec.y;
		return this;
	}
	scalar(vec) {
		return this.x * vec.x + this.y * vec.y;
	}
	scale(v) {
		this.x *= v;
		this.y *= v;
		return this;
	}
	multiply(vec) {
		this.x *= vec.x;
		this.y *= vec.y;
		return this;
	}
	normalize() {
		let r = Math.sqrt(this.x * this.x + this.y * this.y)
		this.x /= r;
		this.y /= r;
		return this;
	}
	getDirection(vec) {
		return new Vec(vec.x - this.x, vec.y - this.y).normalize();
	}
	addScaled(vec, scale) {
		this.x += vec.x * scale;
		this.y += vec.y * scale;
		return this;
	}
	orthogonalize() {
		if (Math.abs(this.x) < Math.abs(this.y)) {
			this.x = 0;
		} else {
			this.y = 0;
		}
		return this;
	}
	isOrthogonal() {
		return (Math.abs(this.x) < 1e-10) || (Math.abs(this.y) < 1e-10)
	}
	str() {
		return this.x + ',' + this.y
	}
	array() {
		return [this.x, this.y]
	}
	static fromChar(char) {
		switch (char.toUpperCase()) {
			case 'N': return new Vec(0, -1);
			case 'S': return new Vec(0, 1);
			case 'W': return new Vec(-1, 0);
			case 'E': return new Vec(1, 0);
			default: throw Error();
		}
	}
}
