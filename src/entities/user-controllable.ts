/**
 * Interface for user controllable objects, such as player and free-camera.
 * Provides methods for moving around and triggering indexed actions.
 */
export interface IUserControllable {
	move(dir: Direction): void;
	toggleRun(on: boolean): void;
	rotate(dir: Direction, angle: number): void;

	/**
	 * Sets an action state to ON or OFF as the user presses or releases the associated key/button.
	 * the meaning of the action is defined by the implementation.
	 * the values of [actionId] start from 0.
	 */
	setActionState(actionId: number, on: boolean): void;
}

export enum Direction {
	FORWARD = "forward",
	BACKWARD = "backward",
	LEFT = "left",
	RIGHT = "right",
	UP = "up",
	DOWN = "down",
}
