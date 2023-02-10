import { Vector } from "./vector";

export class Quat extends Vector {
	public constructor(
		x: number,
		y: number,
		z: number,
		w: number
	) {
		super(x, y, z, w);
	}
}