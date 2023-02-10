import { lerp, sqr } from "./functions";
import { Matrix } from "./matrix";
import { Quat } from "./quat";

export class Vector {
	constructor(
		public x = 0,
		public y = 0,
		public z = 0,
		public w = 0
	) {}

	copy(): Vector {
		return new Vector(this.x, this.y, this.z, this.w);
	}

	add(v: Vector): Vector {
		return new Vector(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
	}

	sub(v: Vector): Vector {
		return new Vector(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
	}

	scale(f: number): Vector {
		return new Vector(this.x * f, this.y * f, this.z * f, this.w * f);
	}

	length(): number {
		return Math.sqrt(this.lengthSq());
	}

	lengthSq(): number {
		return sqr(this.x) + sqr(this.y) + sqr(this.z);
	}

	dot(v: Vector): number {
		return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
	}

	normalize(): Vector {
		const invLen = 1.0 / this.length();
		return new Vector(this.x * invLen, this.y * invLen, this.z * invLen, this.w);
	}

	cross(v: Vector): Vector {
		return new Vector(
			this.z * v.y - this.y * v.z,
			this.x * v.z - this.z * v.x,
			this.y * v.x - this.x * v.y,
			0
		);
	}

	lerp(v: Vector, f: number): Vector {
		return new Vector(lerp(this.x, v.x, f), lerp(this.y, v.y, f), lerp(this.z, v.z, f), lerp(this.w, v.w, f));
	}

	// returns a projection of this vector onto the given axis (axis is assumed to be normalized)
	project(axis: Vector): Vector {
		return axis.scale(this.dot(axis));
	}

	/** returns a new vector obtained by rotating this vector by a quaternion */
	rotate(q: Quat): Vector {
		const u: Vector = q.xyz();
		const s: number = q.w;
		return u.scale(2 * u.dot(this))
			.add(this.scale(s*s - u.dot(u)))
			.add(u.cross(this).scale(2*s));
	}

	/** returns the multiplication of the vector by a matrix, as a new vector */
	mul(m: Matrix): Vector {
		return new Vector(
			this.dot(m.col(0)), this.dot(m.col(1)), this.dot(m.col(2)), this.dot(m.col(3)),
		);
	}

	/** returns a new vector with the z and w components stripped */
	xy(): Vector {
		return new Vector(this.x, this.y);
	}

	/** returns a new vector with the w component stripped */
	xyz(): Vector {
		return new Vector(this.x, this.y, this.z);
	}

	values(count: number): number[] {
		const ret: number[] = [this.x];
		if (count > 1) ret.push(this.y);
		if (count > 2) ret.push(this.z);
		if (count > 3) ret.push(this.w);
		return ret;
	}
}
