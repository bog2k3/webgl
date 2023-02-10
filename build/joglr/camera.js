import { buildProjectionMatrix, buildViewMatrix } from "./math/functions";
import { Matrix } from "./math/matrix";
import { Vector } from "./math/vector";
export class Camera {
    constructor(vp) {
        this.fov_ = Math.PI / 3;
        this.zNear_ = 0.5;
        this.zFar_ = 100;
        this.matView_ = Matrix.identity();
        this.matProj_ = Matrix.identity();
        this.matProjView_ = Matrix.identity();
        this.position_ = new Vector(0, 0, -1);
        this.direction_ = new Vector(0, 0, 1);
        this.up_ = new Vector(0, 1, 0);
        this.viewport_ = vp;
        this.updateProj();
    }
    matProjView() {
        return this.matProjView_;
    }
    position() { return this.position_; }
    direction() { return this.direction_; }
    localX() {
        return this.matView_.row(0).xyz();
    }
    localY() {
        return this.matView_.row(1).xyz();
    }
    move(delta) {
        this.position_ = this.position_.add(delta);
        this.updateView();
    }
    moveTo(where) {
        this.position_ = where;
        this.updateView();
    }
    lookAt(where, up = new Vector(0, 1, 0)) {
        this.direction_ = where.sub(this.position_).normalize();
        this.up_ = up;
        this.updateView();
    }
    orbit(center, rotation, lookTowardCenter = true) {
        const offset = this.position_.sub(center);
        const newOffset = offset.rotate(rotation);
        this.position_ = center.add(newOffset);
        if (lookTowardCenter) {
            this.direction_ = newOffset.scale(-1).normalize();
        }
        this.updateView();
    }
    mirror(plane) {
        const N = plane.xyz();
        const posDist = N.dot(this.position_) + plane.w;
        this.position_ = this.position_.sub(N.scale(2 * posDist));
        this.direction_ = this.direction_.sub(N.scale(2 * N.dot(this.direction_)));
        this.up_ = this.up_.sub(N.scale(2 * N.dot(this.up_)));
        this.updateView();
    }
    setZPlanes(zNear, zFar) {
        this.zNear_ = zNear;
        this.zFar_ = zFar;
        this.updateProj();
    }
    FOV() {
        return this.fov_;
    }
    setFOV(fov) {
        this.fov_ = fov;
        this.updateProj();
    }
    setOrtho(width, height) {
        throw new Error("not implemented");
    }
    getOrthoRect() {
        return new Vector(this.position_.x - this.orthoSize_.x * 0.5, this.position_.y - this.orthoSize_.y * 0.5, this.position_.x + this.orthoSize_.x * 0.5, this.position_.y + this.orthoSize_.y * 0.5);
    }
    updateView() {
        this.matView_ = buildViewMatrix(this.position_, this.direction_, this.up_);
        this.updateProjView();
    }
    updateProj() {
        if (this.fov_ == 0) {
            throw new Error("Ortho not implemented");
        }
        else {
            this.matProj_ = buildProjectionMatrix(this.fov_, this.viewport_.aspectRatio(), this.zNear_, this.zFar_);
        }
        this.updateProjView();
    }
    updateProjView() {
        this.matProjView_ = this.matProj_.mul(this.matView_);
    }
}
//# sourceMappingURL=camera.js.map