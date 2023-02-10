import { Matrix } from "./matrix";
import { Quat } from "./quat";
import { Vector } from "./vector";

/** Creates a rotation quaternion around an axis. The axis is normalized automatically. */
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
	const q0q0 = q.w * q.w;
	const q0q1 = q.w * q.x;
	const q0q2 = q.w * q.y;
	const q0q3 = q.w * q.z;
	const q1q1 = q.x * q.x;
	const q1q2 = q.x * q.y;
	const q1q3 = q.x * q.z;
	const q2q2 = q.y * q.y;
	const q2q3 = q.y * q.z;
	const q3q3 = q.z * q.z;
	// prettier-ignore
	return new Matrix(
		2 * (q0q0 + q1q1) -1,	2 * (q1q2 + q0q3),		2 * (q1q3 - q0q2), 		0,
		2 * (q1q2 - q0q3),		2 * (q0q0 + q2q2) - 1,	2 * (q2q3 + q0q1), 		0,
		2 * (q1q3 + q0q2),		2 * (q2q3 - q0q1),		2 * (q0q0 + q3q3) - 1, 	0,
		0, 						0, 						0, 						1
	);
}

export function matrixToQuat(mat: Matrix): Quat {
	// https://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/
	const m: number[] = mat.getColumnMajorValues();
	const m00 = m[0]; // TODO the indexes may be wrong - check orientation
	const m01 = m[1];
	const m02 = m[2];
	const m10 = m[4];
	const m11 = m[5];
	const m12 = m[6];
	const m20 = m[8];
	const m21 = m[9];
	const m22 = m[10];
	const w = Math.sqrt(1 + m00 + m11 + m22) / 2;
	const w4 = w * 4;
	const x = (m21 - m12) / w4; // TODO the order of subtraction may be wrong
	const y = (m02 - m20) / w4;
	const z = (m10 - m01) / w4;
	return new Quat(x, y, z, w);
}
