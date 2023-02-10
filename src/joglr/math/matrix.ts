import { Vector } from "./vector";

/**
 * Matrixes behave as if they were ROW-MAJOR. All the row(), col() and mul() functions behave as you would expect
 * from a row-major matrix. The constructor also takes values in row-major order.
 * However, internally they store the data in COLUMN-MAJOR order (because of WebGl, sorry about that). This makes it easy to upload them into WebGl.
 * Use VECTOR * MATRIX multiplication order.
 * Thus, the matrix logical "columns" are the axes of the transformed space expressed in the source space.
 */
export class Matrix {
	private m: number[];

	/** pass the values in normal ROW-MAJOR order, they will be automatically converted */
	constructor(...values: number[]) {
		if (values.length != 16) {
			throw new Error("Invalid number of arguments provided to Matrix ctor (expected 16)");
		}
		// prettier-ignore
		this.m = [
			values[0], values[4], values[8], values[12],
			values[1], values[5], values[9], values[13],
			values[2], values[6], values[10], values[14],
			values[3], values[7], values[11], values[15],
		];
	}

	getColumnMajorValues(): number[] {
		return this.m;
	}

	/** builds an identity matrix */
	static identity(): Matrix {
		// prettier-ignore
		return new Matrix(
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		);
	}

	/** builds a translation matrix from a vector */
	static translate(v: Vector): Matrix {
		// prettier-ignore
		return new Matrix(
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			v.x, v.y, v.z, 1
		);
	}

	static scale(sx: number, sy: number, sz: number): Matrix {
		// prettier-ignore
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
		// prettier-ignore
		return new Matrix(
			cosa, 0, -sina, 0,
			0, 1, 0, 0,
			sina, 0, cosa, 0,
			0, 0, 0, 1
		);
	}

	static pitch(alpha: number): Matrix {
		const cosa = Math.cos(alpha);
		const sina = Math.sin(alpha);
		// prettier-ignore
		return new Matrix(
			1, 0, 0, 0,
			0, cosa, sina, 0,
			0, -sina, cosa, 0,
			0, 0, 0, 1
		);
	}

	static roll(alpha: number): Matrix {
		const cosa = Math.cos(alpha);
		const sina = Math.sin(alpha);
		// prettier-ignore
		return new Matrix(
			cosa, sina, 0, 0,
			-sina, cosa, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		);
	}

	static rotate(yaw: number, pitch: number, roll: number): Matrix {
		// prettier-ignore
		return Matrix.pitch(pitch)
			.mul(Matrix.yaw(yaw))
			.mul(Matrix.roll(roll));
	}

	/** returns the i-th logical row, as a Vector */
	row(i: number): Vector {
		// prettier-ignore
		return new Vector(
			this.m[0 * 4 + i],
			this.m[1 * 4 + i],
			this.m[2 * 4 + i],
			this.m[3 * 4 + i]
		);
	}

	/** returns the i-th logical column as a Vector */
	col(i: number): Vector {
		// prettier-ignore
		return new Vector(
			this.m[i * 4 + 0],
			this.m[i * 4 + 1],
			this.m[i * 4 + 2],
			this.m[i * 4 + 3]
		);
	}

	/** Performs matrix multiplication, returning a new matrix
	 * Equivalent to this * m
	 */
	mul(m: Matrix): Matrix {
		// prettier-ignore
		return new Matrix(
			this.row(0).dot(m.col(0)), this.row(0).dot(m.col(1)), this.row(0).dot(m.col(2)), this.row(0).dot(m.col(3)),
			this.row(1).dot(m.col(0)), this.row(1).dot(m.col(1)), this.row(1).dot(m.col(2)), this.row(1).dot(m.col(3)),
			this.row(2).dot(m.col(0)), this.row(2).dot(m.col(1)), this.row(2).dot(m.col(2)), this.row(2).dot(m.col(3)),
			this.row(3).dot(m.col(0)), this.row(3).dot(m.col(1)), this.row(3).dot(m.col(2)), this.row(3).dot(m.col(3)),
		);
	}

	transpose(): Matrix {
		return new Matrix(
			...this.m, // we pass the column-major values as row-major and the constructor will transpose them
		);
	}
}
