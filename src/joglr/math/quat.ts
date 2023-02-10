import { Vector } from "./vector";

export class Quat extends Vector {
	public constructor(x: number, y: number, z: number, w: number) {
		super(x, y, z, w);
	}

	/** Combines the rotations of two quaternions */
	combine(other: Quat): Quat {
		return new Quat(
			this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y, // i
			this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x, // j
			this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w, // k
			this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z, // 1
		);
	}

	override normalize(): Quat {
		return super.normalize() as Quat;
	}
}
