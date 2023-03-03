import { assert } from "../utils/assert";
import { Matrix } from "./matrix";
import { Vector } from "./vector";

/** Returns the first power-of-two number greater than or equal to x */
export function nextPowerOfTwo(x: number): number {
	assert(x << 1 > x); // if x already uses the highest bit then we can't compute
	let r = 1;
	while (r < x) r = r << 1;
	return r;
}

export function clamp(x: number, a: number, b: number): number {
	if (x < a) return a;
	if (x > b) return b;
	return x;
}

export function lerp(a: number, b: number, f: number): number {
	f = clamp(f, 0, 1);
	return a * (1 - f) + b * f;
}

export function sqr(x: number): number {
	return x * x;
}

/** Transforms a vector from world-space into homogenous space and applies perspective division */
export function project(v: Vector, matWorldViewProj: Matrix) {
	v.w = 1;
	const vHomg = v.mul(matWorldViewProj);
	const wInv = 1.0 / v.w;
	vHomg.x *= wInv;
	vHomg.y *= wInv;
	vHomg.z *= wInv;
	return vHomg;
}

/**
 * Builds and returns a viewport transformation matrix, from homogenous space into viewport space;
 * provide the viewport's width and height
 */
export function buildViewportMatrix(viewportW: number, viewportH: number): Matrix {
	return Matrix.scale(viewportW / 2, -viewportH / 2, -0.5).mul(
		Matrix.translate(new Vector(viewportW / 2, viewportH / 2, 0.5)),
	);
}

/**
 * Builds and returns a perspective projection matrix, from camera space into homogenous space;
 * provide the vertical field-of-view (FoV) in radians and the aspect ratio (W/H),
 * as well as the near and far clipping planes
 */
export function buildProjectionMatrix(vFOV: number, aspectRatio: number, zNear: number, zFar: number): Matrix {
	// for info see http://www.3dcpptutorials.sk/index.php?id=2
	const cotHalfFov = 1.0 / Math.tan(vFOV / 2);
	// prettier-ignore
	return new Matrix(
		cotHalfFov / aspectRatio, 0, 0, 0,
		0, cotHalfFov, 0, 0,
		0, 0, (zNear + zFar) / (zFar - zNear), 1,
		0, 0, -2 * zNear * zFar / (zFar - zNear), 0
	);
}

/**
 * Builds and returns a view transformation matrix, from world space into camera space;
 * The matrix is built based on a camera position and direction, and an "UP" vector;
 * The camera direction vector, as well as the "UP" vector are assumed to be normalized,
 * so make sure you normalize them before.
 */
export function buildViewMatrix(cameraPosition: Vector, cameraDirection: Vector, upVector: Vector): Matrix {
	const cZAxis = cameraDirection;
	const cXAxis = upVector.cross(cZAxis).normalize();
	const cYAxis = cZAxis.cross(cXAxis).normalize();
	const cTransInv = new Vector(-cameraPosition.dot(cXAxis), -cameraPosition.dot(cYAxis), -cameraPosition.dot(cZAxis));
	cXAxis.w = cTransInv.x;
	cYAxis.w = cTransInv.y;
	cZAxis.w = cTransInv.z;
	// prettier-ignore
	return Matrix.fromColumns(
		cXAxis,
		cYAxis,
		cZAxis,
		new Vector(0, 0, 0, 1)
	);
}

/**
 * Builds a transformation matrix from object-space into world-space given an origin
 * and forward direction of the object space, expressed in world space
 * The function normalizes vectors automatically.
 */
export function matrixFromPositionDirection(position: Vector, direction: Vector, up = Vector.axisY()): Matrix {
	direction = direction.normalize();
	const right: Vector = up.cross(direction).normalize();
	up = direction.cross(right);
	return Matrix.fromRows(right, up, direction, position);
}
