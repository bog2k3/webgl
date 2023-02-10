import { lerp, sqr } from "./functions";
export class Vector {
    constructor(x = 0, y = 0, z = 0, w = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    copy() {
        return new Vector(this.x, this.y, this.z, this.w);
    }
    add(v) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
    }
    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
    }
    scale(f) {
        return new Vector(this.x * f, this.y * f, this.z * f, this.w * f);
    }
    length() {
        return Math.sqrt(this.lengthSq());
    }
    lengthSq() {
        return sqr(this.x) + sqr(this.y) + sqr(this.z);
    }
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }
    normalize() {
        const invLen = 1.0 / this.length();
        return new Vector(this.x * invLen, this.y * invLen, this.z * invLen, this.w);
    }
    cross(v) {
        return new Vector(this.z * v.y - this.y * v.z, this.x * v.z - this.z * v.x, this.y * v.x - this.x * v.y, 0);
    }
    lerp(v, f) {
        return new Vector(lerp(this.x, v.x, f), lerp(this.y, v.y, f), lerp(this.z, v.z, f), lerp(this.w, v.w, f));
    }
    project(axis) {
        return axis.scale(this.dot(axis));
    }
    rotate(q) {
        throw new Error("not implemented");
        return new Vector();
    }
    mul(m) {
        return new Vector(this.dot(m.col(0)), this.dot(m.col(1)), this.dot(m.col(2)), this.dot(m.col(3)));
    }
    xy() {
        return new Vector(this.x, this.y);
    }
    xyz() {
        return new Vector(this.x, this.y, this.z);
    }
    values(count) {
        const ret = [this.x];
        if (count > 1)
            ret.push(this.y);
        if (count > 2)
            ret.push(this.z);
        if (count > 3)
            ret.push(this.w);
        return ret;
    }
}
//# sourceMappingURL=vector.js.map