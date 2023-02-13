import { buildProjectionMatrix, buildViewMatrix } from "./math/functions";
import { Matrix } from "./math/matrix";
import { Quat } from "./math/quat";
import { Vector } from "./math/vector";
import { Viewport } from "./render/viewport";

export class Camera {
	constructor(vp: Viewport) {
		this.viewport_ = vp;
		this.updateProj();
		this.updateView();
	}

	private viewport_: Viewport;
	private fov_: number = Math.PI / 3; // vertical Field Of View, in radians
	private orthoZoomLevel: number; // How many pixels per meter
	private zNear_: number = 0.5;
	private zFar_: number = 100;
	private matView_ = Matrix.identity();
	private matProj_ = Matrix.identity();
	private matViewProj_ = Matrix.identity();
	private position_ = new Vector(0, 0, 0);
	private direction_ = new Vector(0, 0, 1);
	private up_ = new Vector(0, 1, 0);
	private orthoSize_: Vector; // in world units

	matViewProj(): Matrix {
		return this.matViewProj_;
	}

	/** Returns a copy of the camera position vector, in world space */
	position(): Vector {
		return this.position_.copy();
	}

	/** Returns a copy of the camera look direction vector, in world space */
	direction(): Vector {
		return this.direction_.copy();
	}

	// returns the local X axis (right) vector of the camera, expressed in world space
	localX(): Vector {
		return this.matView_.row(0).xyz();
	}

	// returns the local Y axis (up) vector of the camera, expressed in world space
	localY(): Vector {
		return this.matView_.row(1).xyz();
	}

	move(delta: Vector): void {
		this.position_ = this.position_.add(delta);
		this.updateView();
	}

	moveTo(where: Vector): void {
		this.position_ = where;
		this.updateView();
	}

	lookAt(where: Vector, up = new Vector(0, 1, 0)): void {
		this.direction_ = where.sub(this.position_).normalize();
		this.up_ = up;
		this.updateView();
	}

	/**
	 * Orbits the camera around a central point, with a rotation quaternion expressed in local camera coordinates
	 * if [lookTowardCenter] is true, the camera is also redirected to look toward the center point,
	 * otherwise its original orientation is kept
	 */
	orbit(center: Vector, rotation: Quat, lookTowardCenter: boolean = true): void {
		const offset = this.position_.sub(center);
		const newOffset = offset.mulQ(rotation);
		this.position_ = center.add(newOffset);
		if (lookTowardCenter) {
			this.direction_ = newOffset.scale(-1).normalize();
		}
		this.updateView();
	}

	mirror(plane: Vector): void {
		const N = plane.xyz();
		const posDist: number = N.dot(this.position_) + plane.w;
		this.position_ = this.position_.sub(N.scale(2 * posDist));
		this.direction_ = this.direction_.sub(N.scale(2 * N.dot(this.direction_)));
		this.up_ = this.up_.sub(N.scale(2 * N.dot(this.up_)));
		this.updateView();
	}

	setZPlanes(zNear: number, zFar: number): void {
		this.zNear_ = zNear;
		this.zFar_ = zFar;
		this.updateProj();
	}

	FOV(): number {
		return this.fov_;
	}

	setFOV(fov: number): void {
		this.fov_ = fov;
		this.updateProj();
	}

	/** sets ortho projection size {width, height} in world unit: voids */
	setOrtho(width: number, height: number): void {
		throw new Error("not implemented");
	}
	/**
	 *
	 * @returns a vector with x = left, y = bottom, z = right, w = bottom
	 */
	getOrthoRect(): Vector {
		return new Vector(
			this.position_.x - this.orthoSize_.x * 0.5, // left
			this.position_.y - this.orthoSize_.y * 0.5, // bottom
			this.position_.x + this.orthoSize_.x * 0.5, // right
			this.position_.y + this.orthoSize_.y * 0.5, // top
		);
	}

	private updateView(): void {
		this.matView_ = buildViewMatrix(this.position_, this.direction_, this.up_);
		this.updateViewProj();
	}

	private updateProj(): void {
		if (this.fov_ == 0) {
			// set ortho
			// this.matProj_ = glm::orthoLH(-orthoSize_.x * 0.5f, orthoSize_.x * 0.5f, -orthoSize_.y * 0.5f, orthoSize_.y * 0.5f, zNear_, zFar_);
			throw new Error("Ortho not implemented");
		} else {
			// set perspective
			this.matProj_ = buildProjectionMatrix(this.fov_, this.viewport_.aspectRatio(), this.zNear_, this.zFar_);
		}
		this.updateViewProj();
	}

	private updateViewProj(): void {
		this.matViewProj_ = this.matView_.mul(this.matProj_);
	}
}
