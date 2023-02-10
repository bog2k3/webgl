import { Vector } from "./vector";
export class Matrix {
    constructor(...values) {
        this.m = values;
        if (values.length != 16) {
            throw new Error("Invalid number of arguments provided to Matrix ctor (expected 16)");
        }
    }
    copy() {
        return new Matrix(...this.m);
    }
    static identity() {
        return new Matrix(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    static translate(v) {
        return new Matrix(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, v.x, v.y, v.z, 1);
    }
    static scale(sx, sy, sz) {
        return new Matrix(sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1);
    }
    static yaw(alpha) {
        const cosa = Math.cos(alpha);
        const sina = Math.sin(alpha);
        return new Matrix(cosa, 0, sina, 0, 0, 1, 0, 0, -sina, 0, cosa, 0, 0, 0, 0, 1);
    }
    static pitch(alpha) {
        const cosa = Math.cos(alpha);
        const sina = Math.sin(alpha);
        return new Matrix(1, 0, 0, 0, 0, cosa, -sina, 0, 0, sina, cosa, 0, 0, 0, 0, 1);
    }
    static roll(alpha) {
        const cosa = Math.cos(alpha);
        const sina = Math.sin(alpha);
        return new Matrix(cosa, -sina, 0, 0, sina, cosa, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    static rotate(yaw, pitch, roll) {
        return Matrix.pitch(pitch)
            .mul(Matrix.yaw(yaw))
            .mul(Matrix.roll(roll));
    }
    row(i) {
        return new Vector(this.m[i * 4 + 0], this.m[i * 4 + 1], this.m[i * 4 + 2], this.m[i * 4 + 3]);
    }
    col(i) {
        return new Vector(this.m[0 * 4 + i], this.m[1 * 4 + i], this.m[2 * 4 + i], this.m[3 * 4 + i]);
    }
    mul(m) {
        return new Matrix(this.row(0).dot(m.col(0)), this.row(0).dot(m.col(1)), this.row(0).dot(m.col(2)), this.row(0).dot(m.col(3)), this.row(1).dot(m.col(0)), this.row(1).dot(m.col(1)), this.row(1).dot(m.col(2)), this.row(1).dot(m.col(3)), this.row(2).dot(m.col(0)), this.row(2).dot(m.col(1)), this.row(2).dot(m.col(2)), this.row(2).dot(m.col(3)), this.row(3).dot(m.col(0)), this.row(3).dot(m.col(1)), this.row(3).dot(m.col(2)), this.row(3).dot(m.col(3)));
    }
}
//# sourceMappingURL=matrix.js.map