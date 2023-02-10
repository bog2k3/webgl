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

	/** Combines the rotations of two quaternions.
	 * Equivalent to this * other
	 */
	combine(other: Quat): Quat {
		return new Quat(
			this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y, // i
			this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x, // j
			this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w, // k
			this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z, // 1
		);
	}

	override normalize(): Quat {
		const normVec: Vector = super.normalize();
		return new Quat(normVec.x, normVec.y, normVec.z, normVec.w);
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
