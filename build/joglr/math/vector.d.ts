import { Matrix } from "./matrix";
import { Quat } from "./quat";
export declare class Vector {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
    copy(): Vector;
    add(v: Vector): Vector;
    sub(v: Vector): Vector;
    scale(f: number): Vector;
    length(): number;
    lengthSq(): number;
    dot(v: Vector): number;
    normalize(): Vector;
    cross(v: Vector): Vector;
    lerp(v: Vector, f: number): Vector;
    project(axis: Vector): Vector;
    rotate(q: Quat): Vector;
    mul(m: Matrix): Vector;
    xy(): Vector;
    xyz(): Vector;
    values(count: number): number[];
}
