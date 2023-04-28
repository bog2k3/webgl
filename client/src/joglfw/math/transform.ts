import { Matrix } from "./matrix";
import { Quat } from "./quat";
import { matrixToQuat, quatRotation, quatToMatrix } from "./quat-functions";
import { Vector } from "./vector";

export class Transform {
	constructor(position?: Vector, orientation?: Quat) {
		this.pos_ = position ?? new Vector(0);
		this.orient_ = orientation ?? new Quat(0, 0, 0, 1);
	}

	copy(): Transform {
		return new Transform(this.pos_.copy(), this.orient_.copy());
	}

	copyFrom(tr: Transform): this {
		this.pos_ = tr.pos_.copy();
		this.orient_ = tr.orient_.copy();
		this.matDirty_ = true;
		return this;
	}

	/** get a copy of the position expressed in parent's coordinate space */
	position(): Vector {
		return this.pos_.copy();
	}

	/** get a copy of the orientation expressed in parent's coordinate space*/
	orientation(): Quat {
		return this.orient_.copy();
	}

	/** returns a 4x4 openGL transformation matrix from local space into parent space */
	glMatrix(): Matrix {
		if (this.matDirty_) {
			this.updateGLMat();
		}
		return this.glMat_;
	}

	/** returns the local X axis expressed in parent's coordinate space */
	axisX(): Vector {
		return Vector.axisX().mulQ(this.orient_);
	}
	/** returns the local Y axis expressed in parent's coordinate space */
	axisY(): Vector {
		return Vector.axisY().mulQ(this.orient_);
	}
	/** returns the local Z axis expressed in parent's coordinate space */
	axisZ(): Vector {
		return Vector.axisZ().mulQ(this.orient_);
	}

	/** returns the inverse transformation */
	inverse(): Transform {
		const inverseRotation: Quat = this.orient_.inverse();
		return new Transform(this.pos_.scale(-1).mulQ(inverseRotation), inverseRotation);
	}

	/** set a new position for the transform, expressed in parent's coordinate space */
	setPosition(pos: Vector): void {
		this.pos_ = pos;
		this.matDirty_ = true;
	}

	/** set a new orientation for the transform, expressed in parent's coordinate space */
	setOrientation(orient: Quat): void {
		this.orient_ = orient.copy().normalizeInPlace();
		this.matDirty_ = true;
	}

	/** set the orientation such that the transform will point toward the specified point in parent space, given an up vector */
	lookAt(refPos: Vector, refUp = Vector.axisY()): void {
		const direction: Vector = refPos.sub(this.pos_).normalize();
		const xAxis = refUp.cross(direction).normalizeInPlace();
		const yAxis = direction.cross(xAxis);
		this.orient_ = matrixToQuat(Matrix.fromRows(xAxis, yAxis, direction, new Vector(0, 0, 0, 1)));
		this.matDirty_ = true;
	}

	/** move the transform by an amount expressed in *PARENT* (reference) coordinates */
	moveRef(delta: Vector): void {
		this.pos_.addInPlace(delta);
		this.matDirty_ = true;
	}

	/** move the transform by an amount expressed in *LOCAL* coordinates */
	moveLocal(delta: Vector): void {
		this.pos_.addInPlace(delta.mulQ(this.orient_));
		this.matDirty_ = true;
	}

	/** move to a position in *PARENT* space */
	moveTo(refPos: Vector): void {
		this.pos_ = refPos;
		this.matDirty_ = true;
	}

	/** rotate the transform by a quaternion expressed in *PARENT* (reference) coordinates */
	rotateRef(rot: Quat): void {
		this.orient_.combineInPlace(rot);
		this.matDirty_ = true;
	}

	/** rotate the transform by a quaternion expressed in *LOCAL* coordinates */
	rotateLocal(rot: Quat): void {
		this.orient_ = rot.combine(this.orient_);
		this.matDirty_ = true;
	}

	/**
	 * Returns a new transform that is the result of this (as left) combined with the argument (as right)
	 * The resulting transform will apply "this" before "right"
	 */
	combine(right: Transform): Transform {
		// return new Transform(this.pos_.mulQ(right.orient_).add(right.pos_), this.orient_.combine(right.orient_));
		return this.copy().combineInPlace(right);
	}

	/**
	 * Alters this transform by combining it (to the right) with the argument.
	 * The "right" transform behaves as if it comes into effect *after* this one when applying it to a vector
	 */
	combineInPlace(right: Transform): this {
		this.pos_ = this.pos_.mulQ(right.orient_).addInPlace(right.pos_);
		this.orient_ = this.orient_.combineInPlace(right.orient_);
		return this;
	}

	// -------------------- PRIVATE AREA ----------------------------- //
	private pos_: Vector;
	private orient_: Quat;
	private glMat_: Matrix;
	private matDirty_ = true;

	private updateGLMat(): void {
		this.glMat_ = quatToMatrix(this.orient_);
		const matrixValues: number[] = this.glMat_.getColumnMajorValues();
		matrixValues[0 * 4 + 3] = this.pos_.x;
		matrixValues[1 * 4 + 3] = this.pos_.y;
		matrixValues[2 * 4 + 3] = this.pos_.z;
		this.matDirty_ = false;
	}
}
