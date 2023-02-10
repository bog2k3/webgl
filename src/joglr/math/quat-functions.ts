import { Quat } from "./quat";
import { Vector } from "./vector";

export function quatRotation(axis: Vector, angle: number): Quat {
	axis = axis.normalize();
	const qx = axis.x * Math.sin(angle/2);
	const qy = axis.y * Math.sin(angle/2);
	const qz = axis.z * Math.sin(angle/2);
	const qw = Math.cos(angle/2);
	return new Quat(qx, qy, qz, qw);
}
