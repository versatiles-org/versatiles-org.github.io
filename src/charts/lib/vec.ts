import type { PointType } from './svg.ts';

const TINY = 1e-10;

export class Vec {
	private x: number;

	private y: number;

	public constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	public static fromChar(char: string): Vec {
		switch (char.toUpperCase()) {
			case 'N': return new Vec(0, -1);
			case 'S': return new Vec(0, 1);
			case 'W': return new Vec(-1, 0);
			case 'E': return new Vec(1, 0);
			default: throw Error();
		}
	}

	public clone(): Vec {
		return new Vec(this.x, this.y);
	}

	public add(vec: Vec): this {
		this.x += vec.x;
		this.y += vec.y;
		return this;
	}

	public scalar(vec: Vec): number {
		return this.x * vec.x + this.y * vec.y;
	}

	public scale(v: number): this {
		this.x *= v;
		this.y *= v;
		return this;
	}

	public multiply(vec: Vec): this {
		this.x *= vec.x;
		this.y *= vec.y;
		return this;
	}

	public normalize(): this {
		const r = Math.sqrt(this.x * this.x + this.y * this.y);
		this.x /= r;
		this.y /= r;
		return this;
	}

	public getDirection(vec: Vec): Vec {
		return new Vec(vec.x - this.x, vec.y - this.y).normalize();
	}

	public addScaled(vec: Vec, scale: number): this {
		this.x += vec.x * scale;
		this.y += vec.y * scale;
		return this;
	}

	public snapToAxis(): this {
		if (Math.abs(this.x) < Math.abs(this.y)) {
			this.x = 0;
		} else {
			this.y = 0;
		}
		return this;
	}

	public isParallelToAxis(): boolean {
		return (Math.abs(this.x) < TINY) || (Math.abs(this.y) < TINY);
	}

	public str(): string {
		return this.x + ',' + this.y;
	}

	public array(): PointType {
		return [this.x, this.y];
	}

	public isOpposite(vec: Vec): boolean {
		const dx = this.x + vec.x;
		const dy = this.y + vec.y;
		return Math.sqrt(dx * dx + dy * dy) < TINY;
	}

	public isOrthogonal(vec: Vec): boolean {
		return Math.abs(this.clone().scalar(vec)) < TINY;
	}

	public isEqual(vec: Vec): boolean {
		const dx = this.x - vec.x;
		const dy = this.y - vec.y;
		return Math.sqrt(dx * dx + dy * dy) < 1e-10;
	}

	public getChar(): string {
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

	public isHorizontal(): boolean {
		return Math.abs(this.y) < TINY;
	}

	public isVertical(): boolean {
		return Math.abs(this.x) < TINY;
	}

	public setX(x: number): this {
		this.x = x;
		return this;
	}

	public setY(y: number): this {
		this.y = y;
		return this;
	}

	public getWithX(x: number): Vec {
		return new Vec(x, this.y);
	}

	public getWithY(y: number): Vec {
		return new Vec(this.x, y);
	}

	public getMiddle(vec: Vec): Vec {
		return new Vec((this.x + vec.x) / 2, (this.y + vec.y) / 2);
	}

	public getDistanceSquared(vec: Vec): number {
		const dx = this.x - vec.x;
		const dy = this.y - vec.y;
		return dx * dx + dy * dy;
	}

	public getTowards(vec: Vec, distance: number): Vec {
		const dir = this.getDirection(vec);
		return this.clone().addScaled(dir, distance);
	}

	public getRotated90(): Vec {
		return new Vec(this.y, - this.x);
	}

	public getAngleTo(vec: Vec): number {
		return vec.x * this.y - vec.y * this.x;
	}
}
