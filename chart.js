import { Canvas } from "./canvas.js";
import { Color } from "./color.js";
import { Vec } from "./vec.js";

const fontFamily = 'sans-serif';

export class Chart {
	constructor() {
		this.canvas = new Canvas();

		this.y0 = 0;
		this.layers = Object.fromEntries(
			'background,boxes,lines,headlines'.split(',')
				.map(k => [k, this.canvas.appendGroup()])
		);

		this.colWidth = 200;
		this.colStart = 220;
		this.boxWidth = 120;
		this.boxHeight = 40;
		this.gapHeight = 40;
		this.backgroundColor = new Color('#000');
	}

	asSVG() {
		return this.canvas.asSVG();
	}

	addHeadline(text) {
		this.addBreak(2);

		let group = this.layers.headlines;
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
		let group = this.layers.boxes;
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
		return group;
	}

	addCover(type, name, connections, position) {
		this.coverLastPosition ??= -3.1;

		position ??= connections[0];
		if (position === this.coverLastPosition) this.y0 += this.boxHeight / 2;
		this.coverLastPosition = position;

		let [color] = this.#getType(type);

		let cy = this.y0 + this.boxHeight / 2;

		connections.forEach(c => {
			let x = this.colStart + c * this.colWidth;
			this.layers.lines.drawCircle([x, cy], 5, { fill: color });
		})

		let x = this.colStart + (position + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer([x, this.y0], type, name);

		let cx0 = Math.min(...connections) * this.colWidth + this.colStart;
		let cx1 = Math.max(...connections) * this.colWidth + this.colStart;
		if (cx0 <= x) this.layers.lines.drawLine([cx0, cy], [x, cy], { stroke: color, strokeWidth: 2 });
		if (cx1 > x) this.layers.lines.drawLine([x + this.boxWidth, cy], [cx1, cy], { stroke: color, strokeWidth: 2 });

		this.y0 += this.boxHeight;

		return box;
	}

	addCoverGuides() {
		for (let i = 0; i < 5; i++) {
			let x = this.colStart + this.colWidth * i;
			this.layers.lines.drawLine(
				[x, this.flowYMax],
				[x, this.y0 + this.gapHeight],
				{ stroke: '#F105', strokeWidth: 5 }
			)
		}
	}

	addDependency(type, name, col, ref, options = {}) {
		this.depColY ??= [this.y0, this.y0, this.y0, this.y0];

		if (options.dy) this.depColY[col] += options.dy;
		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer([x, this.depColY[col]], type, name);
		this.depColY[col] += this.boxHeight * 1.5;
		this.y0 = Math.max(this.y0, this.depColY[col]);

		if (ref) {
			let path = this.#getPath(ref, box, options);
			this.layers.lines.drawPath(path.d, { fill: 'none', stroke: box.color + '5', strokeWidth: 1 })
		}

		return box;
	}

	addDepDep(dep0, dep1, options = {}) {
		options.shortenEnd = 5;
		let path = this.#getPath(dep0, dep1, options);
		this.layers.lines.drawPath(path.d, { fill: 'none', stroke: dep0.color, strokeWidth: 2 })
		this.layers.lines.drawArrowHead(
			path.point1.array(),
			path.dir1.scale(10).array(),
			{ fill: dep0.color }
		)
	}

	addRepo(name, col, refs = [], options = {}) {
		this.repoColY ??= [this.y0, this.y0, this.y0, this.y0];

		if (options.dy) this.repoColY[col] += options.dy;
		let x = this.colStart + (col + 0.5) * this.colWidth - this.boxWidth / 2;
		let box = this.#drawContainer([x, this.repoColY[col]], 'repo', name);
		this.repoColY[col] += this.boxHeight * 1.5;
		this.y0 = Math.max(this.y0, this.depColY[col]);

		box.addLink = (ref, options) => {
			let path = this.#getPath(ref, box, options);
			this.layers.lines.drawPath(path.d, { fill: 'none', stroke: this.#fadeColor(box.color, 2 / 3), strokeWidth: 1 })
			return box;
		}

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

		let start0 = center0.clone().addScaled(dir0, distance0 + (opt.shortenStart || 0));
		let start1 = center1.clone().addScaled(dir1, distance1 + (opt.shortenEnd || 0));

		let result = {
			point0: contact0, dir0,
			point1: contact1, dir1
		};
		//console.log({ center0, dir0, size0, contact0 });

		if (dir0.isOpposite(dir1)) {
			if (contact0.getDirection(contact1).isEqual(dir0)) {
				// direkte Linie
				return { ...result, d: makePath(start0, start1) }
			} else {
				if (dir0.isHorizontal()) {
					let x = contact0.getMiddle(contact1).x;
					return { ...result, d: makePath(start0, start0.getWithX(x), start1.getWithX(x), start1) }
				} else if (dir0.isVertical()) {
					let y = contact0.getMiddle(contact1).y;
					return { ...result, d: makePath(start0, start0.getWithY(y), start1.getWithY(y), start1) }
				} else {
					throw Error();
				}
			}
		}

		if (dir0.isEqual(dir1)) {
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

		console.log({ dir0, dir1, contact0, contact1 })
		throw Error();

		function makePath(...points) {
			let radius = opt.radius;
			return points.map((p1, i) => {
				if (i === 0) return 'M' + p1.str();
				if (i === points.length - 1) return 'L' + p1.str();

				let p0 = points[i - 1];
				let p2 = points[i + 1];

				let m = p1.getTowards(p0.getMiddle(p2), radius * 1.414213562373095);
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

	#drawContainer(pos, type, name) {
		const canvas = this.layers.boxes;
		let [color, title] = this.#getType(type);

		const head = [pos[0], pos[1], this.boxWidth, 10]
		canvas.drawRect(head, { fill: color });
		canvas.drawText(head, title, { fill: '#000A', fontFamily, fontSize: 7 });

		const rect = [pos[0], pos[1], this.boxWidth, this.boxHeight];
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

	#fadeColor(color, strength) {
		return new Color(color).fadeTo(this.backgroundColor, strength).toString();
	}
}
