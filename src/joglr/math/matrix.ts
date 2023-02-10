import { Vector } from "./vector";

export class Matrix {

	public m: number[];

	constructor(...values: number[]) {
		this.m = values;
		if (values.length != 16) {
			throw new Error("Invalid number of arguments provided to Matrix ctor (expected 16)");
		}
	}

	copy(): Matrix {
		return new Matrix(...this.m);
	}

	/** builds an identity matrix */
	static identity(): Matrix {
		return new Matrix(
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		);
	}

	/** builds a translation matrix from a vector */
	static translate(v: Vector): Matrix {
		return new Matrix(
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			v.x, v.y, v.z, 1
		);
	}

	static scale(sx: number, sy: number, sz: number): Matrix {
		return new Matrix(
			sx, 0,  0, 0,
			0, sy,  0, 0,
			0,  0, sz, 0,
			0,  0,  0, 1
		);
	}

	static yaw(alpha: number): Matrix {
		const cosa = Math.cos(alpha);
		const sina = Math.sin(alpha);
		return new Matrix(
			cosa, 0, sina, 0,
			0, 1, 0, 0,
			-sina, 0, cosa, 0,
			0, 0, 0, 1
		);
	}

	static pitch(alpha: number): Matrix {
		const cosa = Math.cos(alpha);
		const sina = Math.sin(alpha);
		return new Matrix(
			1, 0, 0, 0,
			0, cosa, -sina, 0,
			0, sina, cosa, 0,
			0, 0, 0, 1
		);
	}

	static roll(alpha: number): Matrix {
		const cosa = Math.cos(alpha);
		const sina = Math.sin(alpha);
		return new Matrix(
			cosa, -sina, 0, 0,
			sina, cosa, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		);
	}

	static rotate(yaw: number, pitch: number, roll: number): Matrix {
		return Matrix.pitch(pitch)
			.mul(Matrix.yaw(yaw))
			.mul(Matrix.roll(roll));
	}

	/** returns the i-th row, as a Vector */
	row(i: number): Vector {
		return new Vector(
			this.m[i * 4 + 0], this.m[i * 4 + 1], this.m[i * 4 + 2], this.m[i * 4 + 3]
		);
	}

	/** returns the i-th col as a Vector */
	col(i: number): Vector {
		return new Vector(
			this.m[0 * 4 + i],
			this.m[1 * 4 + i],
			this.m[2 * 4 + i],
			this.m[3 * 4 + i]
		);
	}

	/** performs matrix multiplication */
	mul(m: Matrix): Matrix {
		return new Matrix(
			this.row(0).dot(m.col(0)), this.row(0).dot(m.col(1)), this.row(0).dot(m.col(2)), this.row(0).dot(m.col(3)),
			this.row(1).dot(m.col(0)), this.row(1).dot(m.col(1)), this.row(1).dot(m.col(2)), this.row(1).dot(m.col(3)),
			this.row(2).dot(m.col(0)), this.row(2).dot(m.col(1)), this.row(2).dot(m.col(2)), this.row(2).dot(m.col(3)),
			this.row(3).dot(m.col(0)), this.row(3).dot(m.col(1)), this.row(3).dot(m.col(2)), this.row(3).dot(m.col(3)),
		);
	}
}
