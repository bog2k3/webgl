import { buildMatrixFromOrientation, clamp } from "../joglr/math/functions";
import { Matrix } from "../joglr/math/matrix";
import { Quat } from "../joglr/math/quat";
import { matrixToQuat } from "../joglr/math/quat-functions";
import { Vector } from "../joglr/math/vector";
import { Entity } from "../joglr/world/entity";
import { IUpdatable } from "../joglr/world/updateable";
import { EntityTypes } from "./entity-types";
import { Direction, IUserControllable } from "./user-controllable";

export class FreeCamera extends Entity implements IUserControllable, IUpdatable {
	constructor(position: Vector, direction: Vector) {
		super();
		// TODO implement
		this.transform_.setPosition(position);
		const up = new Vector(0, 1, 0);
		const mRot: Matrix = buildMatrixFromOrientation(new Vector(0), direction, up);
		this.transform_.setOrientation(matrixToQuat(mRot));
	}

	override getType(): string {
		return EntityTypes.FreeCamera;
	}

	update(dt: number) {
		const maxMoveSpeed = 3.0 * (this.running_ ? 8.0 : 1.0); // m/s
		const linearAcceleration = maxMoveSpeed / 0.25; // m/s^2	- we want to reach the target speed in 0.25 seconds

		// compute the speed alteration based on inputs
		const fmv_len = this.frameMoveValues_.length();
		if (fmv_len > 0) this.frameMoveValues_ = this.frameMoveValues_.scale(1.0 / fmv_len); // normalize direction vector
		this.frameMoveValues_ = this.frameMoveValues_.scale(maxMoveSpeed); // this vector now represents our target speed in camera space
		// transform it into world space:
		this.frameMoveValues_ = this.frameMoveValues_.mulQ(this.transform_.orientation());
		// how much ground we have to cover to reach that speed
		const delta: Vector = this.frameMoveValues_.sub(this.speed_);
		const factor: number = clamp(linearAcceleration * dt, 0, 1);
		this.speed_ = this.speed_.add(delta.scale(factor));
		this.transform_.moveWorld(this.speed_.scale(dt));
		this.frameMoveValues_ = new Vector(0);

		// compute rotation alteration based on inputs
		const deltaRot: Vector = this.frameRotateValues_;
		// TODO implement
		this.transform_.rotateWorld(new Quat(0, 1, 0, deltaRot.x));
		this.transform_.rotateLocal(new Quat(1, 0, 0, deltaRot.y));
		this.frameRotateValues_ = new Vector(0);
	}

	move(dir: Direction) {
		switch (dir) {
			case Direction.FORWARD:
				this.frameMoveValues_.z += 1;
				break;
			case Direction.BACKWARD:
				this.frameMoveValues_.z -= 1;
				break;
			case Direction.LEFT:
				this.frameMoveValues_.x -= 1;
				break;
			case Direction.RIGHT:
				this.frameMoveValues_.x += 1;
				break;
			case Direction.UP:
				this.frameMoveValues_.y += 1;
				break;
			case Direction.DOWN:
				this.frameMoveValues_.y -= 1;
				break;
			default:
				break;
		}
	}

	toggleRun(on: boolean): void {
		this.running_ = on;
	}
	rotate(dir: Direction, angle: number) {
		switch (dir) {
			case Direction.LEFT:
				this.frameRotateValues_.y -= angle;
				break;
			case Direction.RIGHT:
				this.frameRotateValues_.y += angle;
				break;
			case Direction.UP:
				this.frameRotateValues_.x -= angle;
				break;
			case Direction.DOWN:
				this.frameRotateValues_.x += angle;
				break;
			default:
				break;
		}
	}

	setActionState(actionId: number, on: boolean): void {}

	// -------------------- PRIVATE AREA ----------------------------- //
	speed_ = new Vector(0);
	running_ = false;
	frameMoveValues_ = new Vector(0);
	frameRotateValues_ = new Vector(0);
}
