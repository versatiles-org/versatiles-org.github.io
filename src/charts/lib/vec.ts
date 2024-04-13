import { PointType } from './svg.ts';

const TINY = 1e-10;

export class Vec {
	private x: number;
	private y: number;
	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
	clone(): Vec {
		return new Vec(this.x, this.y);
	}
	add(vec: Vec): Vec {
		this.x += vec.x;
		this.y += vec.y;
		return this;
	}
	scalar(vec: Vec): number {
		return this.x * vec.x + this.y * vec.y;
	}
	scale(v: number): Vec {
		this.x *= v;
		this.y *= v;
		return this;
	}
	multiply(vec: Vec): Vec {
		this.x *= vec.x;
		this.y *= vec.y;
		return this;
	}
	normalize(): Vec {
		let r = Math.sqrt(this.x * this.x + this.y * this.y)
		this.x /= r;
		this.y /= r;
		return this;
	}
	getDirection(vec: Vec): Vec {
		return new Vec(vec.x - this.x, vec.y - this.y).normalize();
	}
	addScaled(vec: Vec, scale: number): Vec {
		this.x += vec.x * scale;
		this.y += vec.y * scale;
		return this;
	}
	snapToAxis(): Vec {
		if (Math.abs(this.x) < Math.abs(this.y)) {
			this.x = 0;
		} else {
			this.y = 0;
		}
		return this;
	}
	isParallelToAxis(): boolean {
		return (Math.abs(this.x) < TINY) || (Math.abs(this.y) < TINY)
	}
	str(): string {
		return this.x + ',' + this.y
	}
	array(): PointType {
		return [this.x, this.y]
	}
	isOpposite(vec: Vec): boolean {
		let dx = this.x + vec.x;
		let dy = this.y + vec.y;
		return Math.sqrt(dx * dx + dy * dy) < TINY;
	}
	isOrthogonal(vec: Vec): boolean {
		return Math.abs(this.clone().scalar(vec)) < TINY;
	}
	isEqual(vec: Vec): boolean {
		let dx = this.x - vec.x;
		let dy = this.y - vec.y;
		return Math.sqrt(dx * dx + dy * dy) < 1e-10;
	}
	getChar(): string {
		if (Math.abs(this.x) < TINY) {
			if (Math.abs(this.y - 1) < TINY) {
				return 'S';
			} else if (Math.abs(this.y + 1) < TINY) {
				return 'N';
			} else {
				throw Error();
			}
		} else if (Math.abs(this.y) < TINY) {
			if (Math.abs(this.x - 1) < TINY) {
				return 'E';
			} else if (Math.abs(this.x + 1) < TINY) {
				return 'W';
			} else {
				throw Error();
			}
		} else {
			throw Error();
		}
	}
	isHorizontal(): boolean {
		return Math.abs(this.y) < TINY;
	}
	isVertical(): boolean {
		return Math.abs(this.x) < TINY;
	}
	setX(x: number): Vec {
		this.x = x;
		return this;
	}
	setY(y: number): Vec {
		this.y = y;
		return this;
	}
	getWithX(x: number): Vec {
		return new Vec(x, this.y);
	}
	getWithY(y: number): Vec {
		return new Vec(this.x, y);
	}
	getMiddle(vec: Vec): Vec {
		return new Vec((this.x + vec.x) / 2, (this.y + vec.y) / 2);
	}
	getDistanceSquared(vec: Vec): number {
		let dx = this.x - vec.x;
		let dy = this.y - vec.y;
		return dx * dx + dy * dy;
	}
	getTowards(vec: Vec, distance: number): Vec {
		let dir = this.getDirection(vec);
		return this.clone().addScaled(dir, distance);
	}
	getRotated90(): Vec {
		return new Vec(this.y, - this.x);
	}
	getAngleTo(vec: Vec): number {
		return vec.x * this.y - vec.y * this.x;
	}
	static fromChar(char: string): Vec {
		switch (char.toUpperCase()) {
			case 'N': return new Vec(0, -1);
			case 'S': return new Vec(0, 1);
			case 'W': return new Vec(-1, 0);
			case 'E': return new Vec(1, 0);
			default: throw Error();
		}
	}
}
