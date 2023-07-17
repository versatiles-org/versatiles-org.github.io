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

	addDependency(type, name, col, ref, options = {}) {
		this.dependencyGroup ??= this.canvas.appendGroup();
		this.depColY ??= [this.y0, this.y0, this.y0, this.y0];

		if (options.dy) this.depColY[col] += options.dy;
		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer(this.dependencyGroup, [x, this.depColY[col]], type, name);
		this.depColY[col] += this.boxHeight * 1.5;

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
		this.dependencyGroup.drawArrowHead(path.point1, path.dir1.map(v => 10 * v), { fill: dep0.color })
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

	#getPath(box0, box1, opt = {}) {
		opt.shortenStart ??= 0;
		opt.shortenEnd ??= 0;
		opt.offset ??= 20;
		opt.radius ??= 0;

		let size0 = [box0.rect[2] / 2, box0.rect[3] / 2];
		let size1 = [box1.rect[2] / 2, box1.rect[3] / 2];
		let point0 = [box0.rect[0] + size0[0], box0.rect[1] + size0[1]];
		let point1 = [box1.rect[0] + size1[0], box1.rect[1] + size1[1]];
		let dx = point0[0] - point1[0];
		let dy = point0[1] - point1[1];
		let dir0;
		if (Math.abs(dx) > Math.abs(dy)) {
			dir0 = (dx < 0) ? [1, 0] : [-1, 0];
		} else {
			dir0 = (dy < 0) ? [0, 1] : [0, -1];
		}
		let dir1 = dir0.map(v => -v);

		if (opt.startDir) dir0 = dirLookup(opt.startDir);
		if (opt.endDir) dir1 = dirLookup(opt.endDir);

		let con0 = p(i => point0[i] + (size0[i] - opt.radius + opt.offset) * dir0[i]);
		let con1 = p(i => point1[i] + (size1[i] - opt.radius + opt.offset) * dir1[i]);

		return {
			point0: p(i => point0[i] + size0[i] * dir0[i]), dir0,
			point1: p(i => point1[i] + size1[i] * dir1[i]), dir1,
			d: [
				'M',
				p(i => point0[i] + (size0[i] + opt.shortenStart) * dir0[i]).join(','),
				'L',
				con0.join(','),



				'L',
				con1.join(','),
				'L',
				p(i => point1[i] + (size1[i] + opt.shortenEnd) * dir1[i]).join(',')
			].join('')
		};

		function p(cb) {
			return [0, 1].map(i => cb(i));
		}

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
