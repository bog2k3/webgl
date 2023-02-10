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
}
