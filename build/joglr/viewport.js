import { Camera } from "./camera";
import { Matrix } from "./math/matrix";
import { Vector } from "./math/vector";
export class Viewport {
    constructor(x, y, w, h) {
        this.enabled_ = true;
        this.backgroundColor_ = new Vector(0, 0, 0, 1);
        this.mPV_cache_ = Matrix.identity();
        this.mPV_inv_cache_ = Matrix.identity();
        this.viewportArea_ = new Vector(x, y, w, h);
        this.camera_ = new Camera(this);
        this.updateVP2UMat();
        this.camera_.moveTo(new Vector(0, 0, -1));
    }
    bkColor() {
        return this.backgroundColor_.copy();
    }
    setBkColor(c) {
        this.backgroundColor_ = c.copy();
    }
    camera() {
        return this.camera_;
    }
    width() {
        return this.viewportArea_.z;
    }
    height() {
        return this.viewportArea_.w;
    }
    aspectRatio() {
        return this.width() / this.height();
    }
    position() {
        return this.viewportArea_.xy();
    }
    isEnabled() {
        return this.enabled_;
    }
    containsPoint(p) {
        return p.x >= this.viewportArea_.x && p.y >= this.viewportArea_.y &&
            p.x <= this.viewportArea_.x + this.viewportArea_.z &&
            p.y <= this.viewportArea_.y + this.viewportArea_.w;
    }
    screenRect() {
        return this.viewportArea_.copy();
    }
    project(point) {
        throw new Error("not implemented");
    }
    unproject(point) {
        throw new Error("not implemented");
    }
    viewport2Uniform() {
        return this.mViewport2Uniform_.copy();
    }
    setEnabled(enabled) {
        this.enabled_ = enabled;
    }
    setArea(vpX, vpY, vpW, vpH) {
        this.viewportArea_ = new Vector(vpX, vpY, vpW, vpH);
        this.updateVP2UMat();
        this.camera_["updateProj"]();
    }
    clear() {
        throw new Error("not implemented");
    }
    renderList(list, ctx) {
        throw new Error("not implemented");
    }
    prepareForRender() {
        console.error("not implemented");
    }
    resetAfterRender() {
        console.error("not implemented");
    }
    updateVP2UMat() {
        const vpw = this.width(), vph = this.height();
        const sx = 2.0 / (vpw - 1);
        const sy = -2.0 / (vph - 1);
        const sz = -1.e-2;
        const matVP_to_UniformScale = Matrix.scale(sx, sy, sz);
        this.mViewport2Uniform_ = matVP_to_UniformScale.mul(Matrix.translate(new Vector(-vpw / 2, -vph / 2)));
    }
}
;
//# sourceMappingURL=viewport.js.map