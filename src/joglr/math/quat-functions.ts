import { Matrix } from "./matrix";
import { Quat } from "./quat";
import { Vector } from "./vector";

export function quatRotation(axis: Vector, angle: number): Quat {
	axis = axis.normalize();
	const sina2 = Math.sin(angle / 2);
	const qx = axis.x * sina2;
	const qy = axis.y * sina2;
	const qz = axis.z * sina2;
	const qw = Math.cos(angle / 2);
	return new Quat(qx, qy, qz, qw);
}

export function quatToMatrix(q: Quat): Matrix {
	// https://automaticaddison.com/how-to-convert-a-quaternion-to-a-rotation-matrix/
	const q00 = q.x * q.x;
	const q01 = q.x * q.y;
	const q02 = q.x * q.z;
	const q03 = q.x * q.w;
	const q11 = q.y * q.y;
	const q12 = q.y * q.z;
	const q13 = q.y * q.w;
	const q22 = q.z * q.z;
	const q23 = q.z * q.w;
	const q33 = q.w * q.w;
	// prettier-ignore
	return new Matrix(
		2 * (q00 + q11) -1,		2 * (q12 - q03),		2 * (q13 + q02), 		0,
		2 * (q12 + q03),		2 * (q00 + q22) - 1,	2 * (q23 - q01), 		0,
		2 * (q13 - q02),		2 * (q23 + q01),		2 * (q00 + q33) - 1, 	0,
		0, 						0, 						0, 						1
	);
}

export function matrixToQuat(m: Matrix): Quat {
	const m00 = m.m[0];
	const m01 = m.m[1];
	const m02 = m.m[2];
	const m10 = m.m[4];
	const m11 = m.m[5];
	const m12 = m[6];
	const m20 = m.m[8];
	const m21 = m.m[9];
	const m22 = m.m[10];
	const w = Math.sqrt(1 + m00 + m11 + m22) / 2;
	const x = (m21 - m12) / (4 * w);
	const y = (m02 - m20) / (4 * w);
	const z = (m10 - m01) / (4 * w);
	return new Quat(x, y, z, w);
}
