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

	/**
	 * Builds a matrix from 4 column vectors
	 */
	static fromColumns(...columns: Vector[]): Matrix {
		// prettier-ignore
		return new Matrix(
			columns[0].x, columns[1].x, columns[2].x, columns[3].x,
			columns[0].y, columns[1].y, columns[2].y, columns[3].y,
			columns[0].z, columns[1].z, columns[2].z, columns[3].z,
			columns[0].w, columns[1].w, columns[2].w, columns[3].w,
		);
	}

	/**
	 * Builds a matrix from 4 row vectors
	 */
	static fromRows(...rows: Vector[]): Matrix {
		// prettier-ignore
		return new Matrix(
			...rows[0].values(4),
			...rows[1].values(4),
			...rows[2].values(4),
			...rows[3].values(4),
		);
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

	/** Creates and returns a deep copy of this matrix */
	copy(): Matrix {
		const a = this.m;
		// prettier-ignore
		return new Matrix(
			a[0], a[4], a[8], a[12],
			a[1], a[5], a[9], a[13],
			a[2], a[6], a[10], a[14],
			a[3], a[7], a[11], a[15]
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

	inverse(): Matrix {
		const A2323 = this.m[2 * 4 + 2] * this.m[3 * 4 + 3] - this.m[2 * 4 + 3] * this.m[3 * 4 + 2];
		const A1323 = this.m[2 * 4 + 1] * this.m[3 * 4 + 3] - this.m[2 * 4 + 3] * this.m[3 * 4 + 1];
		const A1223 = this.m[2 * 4 + 1] * this.m[3 * 4 + 2] - this.m[2 * 4 + 2] * this.m[3 * 4 + 1];
		const A0323 = this.m[2 * 4 + 0] * this.m[3 * 4 + 3] - this.m[2 * 4 + 3] * this.m[3 * 4 + 0];
		const A0223 = this.m[2 * 4 + 0] * this.m[3 * 4 + 2] - this.m[2 * 4 + 2] * this.m[3 * 4 + 0];
		const A0123 = this.m[2 * 4 + 0] * this.m[3 * 4 + 1] - this.m[2 * 4 + 1] * this.m[3 * 4 + 0];
		const A2313 = this.m[1 * 4 + 2] * this.m[3 * 4 + 3] - this.m[1 * 4 + 3] * this.m[3 * 4 + 2];
		const A1313 = this.m[1 * 4 + 1] * this.m[3 * 4 + 3] - this.m[1 * 4 + 3] * this.m[3 * 4 + 1];
		const A1213 = this.m[1 * 4 + 1] * this.m[3 * 4 + 2] - this.m[1 * 4 + 2] * this.m[3 * 4 + 1];
		const A2312 = this.m[1 * 4 + 2] * this.m[2 * 4 + 3] - this.m[1 * 4 + 3] * this.m[2 * 4 + 2];
		const A1312 = this.m[1 * 4 + 1] * this.m[2 * 4 + 3] - this.m[1 * 4 + 3] * this.m[2 * 4 + 1];
		const A1212 = this.m[1 * 4 + 1] * this.m[2 * 4 + 2] - this.m[1 * 4 + 2] * this.m[2 * 4 + 1];
		const A0313 = this.m[1 * 4 + 0] * this.m[3 * 4 + 3] - this.m[1 * 4 + 3] * this.m[3 * 4 + 0];
		const A0213 = this.m[1 * 4 + 0] * this.m[3 * 4 + 2] - this.m[1 * 4 + 2] * this.m[3 * 4 + 0];
		const A0312 = this.m[1 * 4 + 0] * this.m[2 * 4 + 3] - this.m[1 * 4 + 3] * this.m[2 * 4 + 0];
		const A0212 = this.m[1 * 4 + 0] * this.m[2 * 4 + 2] - this.m[1 * 4 + 2] * this.m[2 * 4 + 0];
		const A0113 = this.m[1 * 4 + 0] * this.m[3 * 4 + 1] - this.m[1 * 4 + 1] * this.m[3 * 4 + 0];
		const A0112 = this.m[1 * 4 + 0] * this.m[2 * 4 + 1] - this.m[1 * 4 + 1] * this.m[2 * 4 + 0];

		var det =
			this.m[0 * 4 + 0] * (this.m[1 * 4 + 1] * A2323 - this.m[1 * 4 + 2] * A1323 + this.m[1 * 4 + 3] * A1223) -
			this.m[0 * 4 + 1] * (this.m[1 * 4 + 0] * A2323 - this.m[1 * 4 + 2] * A0323 + this.m[1 * 4 + 3] * A0223) +
			this.m[0 * 4 + 2] * (this.m[1 * 4 + 0] * A1323 - this.m[1 * 4 + 1] * A0323 + this.m[1 * 4 + 3] * A0123) -
			this.m[0 * 4 + 3] * (this.m[1 * 4 + 0] * A1223 - this.m[1 * 4 + 1] * A0223 + this.m[1 * 4 + 2] * A0123);
		if (det === 0) {
			return Matrix.identity();
		}
		det = 1 / det;

		return new Matrix(
			det * (this.m[1 * 4 + 1] * A2323 - this.m[1 * 4 + 2] * A1323 + this.m[1 * 4 + 3] * A1223),
			det * -(this.m[0 * 4 + 1] * A2323 - this.m[0 * 4 + 2] * A1323 + this.m[0 * 4 + 3] * A1223),
			det * (this.m[0 * 4 + 1] * A2313 - this.m[0 * 4 + 2] * A1313 + this.m[0 * 4 + 3] * A1213),
			det * -(this.m[0 * 4 + 1] * A2312 - this.m[0 * 4 + 2] * A1312 + this.m[0 * 4 + 3] * A1212),
			det * -(this.m[1 * 4 + 0] * A2323 - this.m[1 * 4 + 2] * A0323 + this.m[1 * 4 + 3] * A0223),
			det * (this.m[0 * 4 + 0] * A2323 - this.m[0 * 4 + 2] * A0323 + this.m[0 * 4 + 3] * A0223),
			det * -(this.m[0 * 4 + 0] * A2313 - this.m[0 * 4 + 2] * A0313 + this.m[0 * 4 + 3] * A0213),
			det * (this.m[0 * 4 + 0] * A2312 - this.m[0 * 4 + 2] * A0312 + this.m[0 * 4 + 3] * A0212),
			det * (this.m[1 * 4 + 0] * A1323 - this.m[1 * 4 + 1] * A0323 + this.m[1 * 4 + 3] * A0123),
			det * -(this.m[0 * 4 + 0] * A1323 - this.m[0 * 4 + 1] * A0323 + this.m[0 * 4 + 3] * A0123),
			det * (this.m[0 * 4 + 0] * A1313 - this.m[0 * 4 + 1] * A0313 + this.m[0 * 4 + 3] * A0113),
			det * -(this.m[0 * 4 + 0] * A1312 - this.m[0 * 4 + 1] * A0312 + this.m[0 * 4 + 3] * A0112),
			det * -(this.m[1 * 4 + 0] * A1223 - this.m[1 * 4 + 1] * A0223 + this.m[1 * 4 + 2] * A0123),
			det * (this.m[0 * 4 + 0] * A1223 - this.m[0 * 4 + 1] * A0223 + this.m[0 * 4 + 2] * A0123),
			det * -(this.m[0 * 4 + 0] * A1213 - this.m[0 * 4 + 1] * A0213 + this.m[0 * 4 + 2] * A0113),
			det * (this.m[0 * 4 + 0] * A1212 - this.m[0 * 4 + 1] * A0212 + this.m[0 * 4 + 2] * A0112),
		);
	}
}
