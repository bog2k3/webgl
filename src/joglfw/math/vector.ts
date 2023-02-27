import { assert } from "../utils/assert";
import { lerp, sqr } from "./functions";
import { Matrix } from "./matrix";
import { Quat } from "./quat";

export class Vector {
	constructor(public x = 0, public y = 0, public z = 0, public w = 0) {}

	copy(): Vector {
		return new Vector(this.x, this.y, this.z, this.w);
	}

	equals(v: Vector): boolean {
		return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
	}

	/** modifies the x component and returns this vector */
	setX(x: number): this {
		this.x = x;
		return this;
	}

	/** modifies the y component and returns this vector */
	setY(y: number): this {
		this.y = y;
		return this;
	}

	/** modifies the z component and returns this vector */
	setZ(z: number): this {
		this.z = z;
		return this;
	}

	setW(w: number): this {
		this.w = w;
		return this;
	}

	add(v: Vector): Vector {
		return this.copy().addInPlace(v);
	}

	addInPlace(v: Vector): this {
		this.x += v.x;
		this.y += v.y;
		this.z += v.z;
		this.w += v.w;
		return this;
	}

	sub(v: Vector): Vector {
		return this.copy().subInPlace(v);
	}

	subInPlace(v: Vector): this {
		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;
		this.w -= v.w;
		return this;
	}

	scale(f: number): Vector {
		return this.copy().scaleInPlace(f);
	}

	scaleInPlace(f: number): this {
		this.x *= f;
		this.y *= f;
		this.z *= f;
		this.w *= f;
		return this;
	}

	length(): number {
		return Math.sqrt(this.lengthSq());
	}

	lengthSq(): number {
		return sqr(this.x) + sqr(this.y) + sqr(this.z) + sqr(this.w);
	}

	dot(v: Vector): number {
		return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
	}

	normalize(): Vector {
		return this.copy().normalizeInPlace();
	}

	normalizeInPlace(): this {
		const len = this.length();
		assert(len > Number.EPSILON, "Attempting to normalize vector with zero-length");
		return this.scaleInPlace(1.0 / len);
	}

	/**
	 * The orientation of the cross product follows the Right Hand rule in Right-Handed Coordinate Systems (RHCS)
	 * and Left Hand rule in LHCS.
	 * In fact Z always equals X cross Y no matter what
	 */
	cross(v: Vector): Vector {
		// prettier-ignore
		return new Vector(
			this.y * v.z - this.z * v.y,
			this.z * v.x - this.x * v.z,
			this.x * v.y - this.y * v.x
		);
	}

	lerp(v: Vector, f: number): Vector {
		return new Vector(lerp(this.x, v.x, f), lerp(this.y, v.y, f), lerp(this.z, v.z, f), lerp(this.w, v.w, f));
	}

	// returns a projection of this vector onto the given axis (axis is assumed to be normalized)
	project(axis: Vector): Vector {
		return axis.scale(this.dot(axis));
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

	/** Transforms the vector by a matrix in the order V * M, returning a new vector */
	mul(m: Matrix): Vector {
		return this.copy().mulInPlace(m);
	}

	/** Transforms this vector by a matrix in the order V * M */
	mulInPlace(m: Matrix): this {
		// prettier-ignore
		const newX = this.dot(m.col(0));
		const newY = this.dot(m.col(1));
		const newZ = this.dot(m.col(2));
		const newW = this.dot(m.col(3));
		[this.x, this.y, this.z, this.w] = [newX, newY, newZ, newW];
		return this;
	}

	/**
	 * Rotates this vector by a quaternion, returning a new vector
	 * Equivalent to V' = Q * V * Q'
	 */
	mulQ(q: Quat): Vector {
		return this.copy().mulQInPlace(q);
	}

	/**
	 * Rotates this vector by a quaternion.
	 * Equivalent to this = Q * this * Q'
	 */
	mulQInPlace(q: Quat): this {
		// See https://www.johndcook.com/blog/2021/06/16/faster-quaternion-rotations/
		const qxyz: Vector = q.xyz();
		const t: Vector = qxyz.cross(this).scaleInPlace(2);
		// prettier-ignore
		return this
			.addInPlace(t.scale(q.w))
			.addInPlace(qxyz.cross(t));
	}
}
