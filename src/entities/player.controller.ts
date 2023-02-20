import { Car } from "./car.entity";
import { Direction, IUserControllable } from "./user-controllable";

export class PlayerController implements IUserControllable {
	constructor() {}

	setTargetCar(car: Car) {
		this.car = car;
	}

	move(dir: Direction): void {
		if (!this.car) {
			console.warn(`No car assigned to player, ignoring input.`);
			return;
		}
		switch (dir) {
			case Direction.FORWARD:
				this.car.accelerate();
				break;
			case Direction.LEFT:
				this.car.steerLeft();
				break;
			case Direction.RIGHT:
				this.car.steerRight();
				break;
			case Direction.BACKWARD:
				this.car.brake();
				break;
		}
	}

	toggleRun(on: boolean): void {
		if (!this.car) {
			console.warn(`No car assigned to player, ignoring input.`);
			return;
		}
	}

	rotate(dir: Direction, angle: number): void {
		if (!this.car) {
			console.warn(`No car assigned to player, ignoring input.`);
			return;
		}
	}

	/**
	 * Sets an action state to ON or OFF as the user presses or releases the associated key/button.
	 * the meaning of the action is defined by the implementation.
	 * the values of [actionId] start from 0.
	 */
	setActionState(actionId: number, on: boolean): void {}

	// ------------------------ PRIVATE AREA ---------------------------- //
	private car: Car;
}
