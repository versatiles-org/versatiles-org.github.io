export class Vec {
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
	snapToAxis() {
		if (Math.abs(this.x) < Math.abs(this.y)) {
			this.x = 0;
		} else {
			this.y = 0;
		}
		return this;
	}
	isParallelToAxis() {
		return (Math.abs(this.x) < 1e-10) || (Math.abs(this.y) < 1e-10)
	}
	str() {
		return this.x + ',' + this.y
	}
	array() {
		return [this.x, this.y]
	}
	isOpposite(vec) {
		let dx = this.x + vec.x;
		let dy = this.y + vec.y;
		return Math.sqrt(dx * dx + dy * dy) < 1e-10;
	}
	isEqual(vec) {
		let dx = this.x - vec.x;
		let dy = this.y - vec.y;
		return Math.sqrt(dx * dx + dy * dy) < 1e-10;
	}
	isHorizontal() {
		return Math.abs(this.y) < 1e-10;
	}
	isVertical() {
		return Math.abs(this.x) < 1e-10;
	}
	setX(x) {
		this.x = x;
		return this;
	}
	setY(y) {
		this.y = y;
		return this;
	}
	getWithX(x) {
		return new Vec(x, this.y);
	}
	getWithY(y) {
		return new Vec(this.x, y);
	}
	getMiddle(vec) {
		return new Vec((this.x + vec.x) / 2, (this.y + vec.y) / 2);
	}
	getDistanceSquared(vec) {
		let dx = this.x - vec.x;
		let dy = this.y - vec.y;
		return dx * dx + dy * dy;
	}
	getTowards(vec, distance) {
		let dir = this.getDirection(vec);
		return this.clone().addScaled(dir, distance);
	}
	getRotated90() {
		return new Vec(this.y, - this.x);
	}
	getAngleTo(vec) {
		return vec.x * this.y - vec.y * this.x;
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
