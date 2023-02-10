import { Vector } from "./vector";
export declare class Matrix {
    m: number[];
    constructor(...values: number[]);
    copy(): Matrix;
    static identity(): Matrix;
    static translate(v: Vector): Matrix;
    static scale(sx: number, sy: number, sz: number): Matrix;
    static yaw(alpha: number): Matrix;
    static pitch(alpha: number): Matrix;
    static roll(alpha: number): Matrix;
    static rotate(yaw: number, pitch: number, roll: number): Matrix;
    row(i: number): Vector;
    col(i: number): Vector;
    mul(m: Matrix): Matrix;
}
