import { Matrix } from "./matrix";
import { Vector } from "./vector";
export declare function clamp(x: number, a: number, b: number): number;
export declare function lerp(a: number, b: number, f: number): number;
export declare function sqr(x: number): number;
export declare function project(v: Vector, matWorldViewProj: Matrix): Vector;
export declare function buildViewportMatrix(viewportW: number, viewportH: number): Matrix;
export declare function buildProjectionMatrix(vFOV: number, aspectRatio: number, zNear: number, zFar: number): Matrix;
export declare function buildViewMatrix(cameraPosition: Vector, cameraDirection: Vector, upVector: Vector): Matrix;
