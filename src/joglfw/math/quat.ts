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

	override copy(): Quat {
		return new Quat(this.x, this.y, this.z, this.w);
	}

	/** Combines the rotations of two quaternions.
	 * Equivalent to this * other
	 */
	combine(other: Quat): Quat {
		return this.copy().combineInPlace(other);
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
