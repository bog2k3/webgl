import { quatRotation } from "./quat-functions";
import { Vector } from "./vector";

export class Quat extends Vector {
	public constructor(x: number, y: number, z: number, w: number) {
		super(x, y, z, w);
	}

	static identity(): Quat {
		return new Quat(0, 0, 0, 1);
	}

	static axisAngle(axis: Vector, angle: number): Quat {
		return quatRotation(axis, angle);
	}

	/**
	 * Computes the quaternion that, if applied to a normal vector A, would transform it into the normal vector B.
	 * The vectors are assumed to be normalized.
	 */
	static fromA_to_B(A: Vector, B: Vector): Quat {
		const axis: Vector = A.cross(B);
		const angle = Math.acos(A.dot(B));
		return Quat.axisAngle(axis, angle);
	}

	static fromEulerAngles(yaw: number, pitch: number, roll: number): Quat {
		const sinx = Math.sin(pitch * 0.5);
		const cosx = Math.cos(pitch * 0.5);
		const siny = Math.sin(yaw * 0.5);
		const cosy = Math.cos(yaw * 0.5);
		const sinz = Math.sin(roll * 0.5);
		const cosz = Math.cos(roll * 0.5);
		return new Quat(
			sinx * cosy * cosz - cosx * siny * sinz,
			cosx * siny * cosz + sinx * cosy * sinz,
			cosx * cosy * sinz - sinx * siny * cosz,
			cosx * cosy * cosz + sinx * siny * sinz,
		);
	}

	override copy(): Quat {
		return new Quat(this.x, this.y, this.z, this.w);
	}

	/** "Scales" the rotation represented by this quaternion by doing a slerp between identity and this */
	scaleAngle(f: number): Quat {
		return this.copy().scaleAngleInPlace(f);
	}

	/** "Scales" the rotation represented by this quaternion by doing a slerp between identity and this */
	scaleAngleInPlace(f: number): this {
		return this.slerpInPlace(Quat.identity(), 1 - f);
	}

	getAngle(): number {
		return Math.acos(this.w) * 2;
	}

	/** Combines the rotations of two quaternions.
	 * Equivalent to this * other
	 */
	combine(other: Quat): Quat {
		return this.copy().combineInPlace(other);
	}

	/**
	 * Performs spherical interpolation between this quaternion and another, returning a new quat.
	 * @param t must be between 0.0 (this) and 1.0 (other)
	 */
	slerp(other: Quat, t: number): Quat {
		return this.copy().slerpInPlace(other, t);
	}

	/**
	 * Performs spherical interpolation between this quaternion and another, overwriting this with the result.
	 * @param t must be between 0.0 (this) and 1.0 (other)
	 */
	slerpInPlace(other: Quat, t: number): this {
		// See https://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/index.htm
		const cosHalfTheta = this.dot(other);
		if (cosHalfTheta >= 1) {
			return this; // nothing to do, both are identical
		}
		const halfTheta = Math.acos(cosHalfTheta);
		// prettier-ignore
		return this
			.scaleInPlace(Math.sin(halfTheta * (1 - t)))
			.addInPlace(other.copy().scaleInPlace(Math.sin(halfTheta * t)))
			.scaleInPlace(1.0 / Math.sin(halfTheta));
	}

	/** Combines this quaternion with another, altering "this"
	 * Equivalent to this *= other
	 */
	combineInPlace(other: Quat): this {
		const newX = other.w * this.x + other.x * this.w + other.y * this.z - other.z * this.y; // i
		const newY = other.w * this.y - other.x * this.z + other.y * this.w + other.z * this.x; // j
		const newZ = other.w * this.z + other.x * this.y - other.y * this.x + other.z * this.w; // k
		const newW = other.w * this.w - other.x * this.x - other.y * this.y - other.z * this.z; // 1
		[this.x, this.y, this.z, this.w] = [newX, newY, newZ, newW];
		return this.normalizeInPlace();
	}

	/** Returns the Euler angles (around each of X,Y,Z axes) equivalent to this quaternion */
	toEulerAngles(): Vector {
		// https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
		const q = this;
		let yaw = 0,
			pitch = 0,
			roll = 0;
		// pitch (x-axis rotation)
		const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
		const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
		pitch = Math.atan2(sinr_cosp, cosr_cosp);

		// yaw (y-axis rotation)
		const sinp = Math.sqrt(1 + 2 * (q.w * q.y - q.x * q.z));
		const cosp = Math.sqrt(1 - 2 * (q.w * q.y - q.x * q.z));
		yaw = 2 * Math.atan2(sinp, cosp) - Math.PI / 2;

		// roll (z-axis rotation)
		const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
		const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
		roll = Math.atan2(siny_cosp, cosy_cosp);

		return new Vector(pitch, yaw, roll);
	}
}
