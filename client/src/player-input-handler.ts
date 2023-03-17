import { Direction, IUserControllable } from "./entities/user-controllable";
import { InputEvent, InputEventType, MouseButton } from "./input";
import { IUpdatable } from "./joglfw/world/updateable";

export enum PlayerActions {
	MOVE_FORWARD = 0,
	MOVE_BACKWARD,
	MOVE_LEFT,
	MOVE_RIGHT,
	MOVE_UP,
	MOVE_DOWN,
	RUN,
	ROTATE_YAW,
	ROTATE_PITCH,

	TOGGLE_ACTIONS_FIRST,
	TOGGLE_FIRE,
	TOGGLE_ACTIONS_LAST,

	ALL_ACTIONS,
}

export enum InputDeviceType {
	None,
	Keyboard = "keyboard",
	Mouse = "mouse",
}

export class KeyBindingDescriptor {
	device = InputDeviceType.None;
	/** keycode or button id or axis id, depending on device and analog option */
	code: number | string;
	/** if true, code refers to an analog axis instead of a button */
	analog = false;

	constructor(data?: Partial<KeyBindingDescriptor>) {
		if (data) {
			Object.assign(this, data);
		}
	}
}

export class PlayerInputHandler implements IUpdatable {
	/** maps each action to a key/button/analog axis */
	bindings: Record<PlayerActions, KeyBindingDescriptor> = {} as any;
	/**  radians per hundred pixels */
	mouseSensitivity = 0.2;
	/** invert mouse Y axis (if true, moving the mouse up will make the player look down) */
	invertMouseY = false;

	constructor() {
		for (let action in PlayerActions) {
			this.bindings[action] = new KeyBindingDescriptor();
			this.inputStates_[action] = new InputState();
		}
		this.setDefaultBindings();
	}

	setDefaultBindings(): void {
		this.bindings[PlayerActions.MOVE_FORWARD] = new KeyBindingDescriptor({
			device: InputDeviceType.Keyboard,
			code: "KeyW",
			analog: false,
		});
		this.bindings[PlayerActions.MOVE_BACKWARD] = new KeyBindingDescriptor({
			device: InputDeviceType.Keyboard,
			code: "KeyS",
			analog: false,
		});
		this.bindings[PlayerActions.MOVE_LEFT] = new KeyBindingDescriptor({
			device: InputDeviceType.Keyboard,
			code: "KeyA",
			analog: false,
		});
		this.bindings[PlayerActions.MOVE_RIGHT] = new KeyBindingDescriptor({
			device: InputDeviceType.Keyboard,
			code: "KeyD",
			analog: false,
		});
		this.bindings[PlayerActions.RUN] = new KeyBindingDescriptor({
			device: InputDeviceType.Keyboard,
			code: "ShiftLeft",
			analog: false,
		});
		this.bindings[PlayerActions.MOVE_UP] = new KeyBindingDescriptor({
			device: InputDeviceType.Mouse,
			code: MouseButton.Right,
			analog: false,
		});
		this.bindings[PlayerActions.MOVE_DOWN] = new KeyBindingDescriptor({
			device: InputDeviceType.Keyboard,
			code: "ControlLeft",
			analog: false,
		});
		this.bindings[PlayerActions.ROTATE_YAW] = new KeyBindingDescriptor({
			device: InputDeviceType.Mouse,
			code: 0, // mouse x axis
			analog: true,
		});
		this.bindings[PlayerActions.ROTATE_PITCH] = new KeyBindingDescriptor({
			device: InputDeviceType.Mouse,
			code: 1, // mouse y axis
			analog: true,
		});

		this.bindings[PlayerActions.TOGGLE_FIRE] = new KeyBindingDescriptor({
			device: InputDeviceType.Mouse,
			code: MouseButton.Left,
			analog: false,
		});
	}

	handleInputEvent(ev: InputEvent): void {
		for (let a: PlayerActions = 0; a < PlayerActions.ALL_ACTIONS; a++) {
			switch (this.bindings[a].device) {
				case InputDeviceType.Keyboard:
					{
						// treat keyboard buttons
						if (ev.keyCode == this.bindings[a].code) {
							if (ev.type == InputEventType.KeyDown) {
								this.inputStates_[a].isChanged = this.inputStates_[a].value != 1;
								this.inputStates_[a].value = 1;
								ev.consume();
							} else if (ev.type == InputEventType.KeyUp) {
								this.inputStates_[a].isChanged = this.inputStates_[a].value != 0;
								this.inputStates_[a].value = 0;
								ev.consume();
							}
						}
					}
					break;
				case InputDeviceType.Mouse:
					{
						if (this.bindings[a].analog) {
							// treat mouse movement
							if (ev.type == InputEventType.MouseMoved || ev.type == InputEventType.MouseWheel) {
								if (this.bindings[a].code == 0) {
									// X-axis
									this.inputStates_[a].value += ev.dx * this.mouseSensitivity * 0.01;
									this.inputStates_[a].isChanged = true;
									ev.consume();
								} else if (this.bindings[a].code == 1) {
									// Y-axis
									this.inputStates_[a].value +=
										ev.dy * this.mouseSensitivity * 0.01 * (this.invertMouseY ? -1 : 1);
									this.inputStates_[a].isChanged = true;
									ev.consume();
								} else if (this.bindings[a].code == 2) {
									// Z-axis
									this.inputStates_[a].value += ev.dz; // we don't apply sensitivity to scroll wheel
									this.inputStates_[a].isChanged = true;
									ev.consume();
								}
							}
						} else if (ev.mouseButton == this.bindings[a].code) {
							// treat mouse buttons
							if (ev.type == InputEventType.MouseDown) {
								this.inputStates_[a].isChanged = this.inputStates_[a].value != 1;
								this.inputStates_[a].value = 1;
								ev.consume();
							} else if (ev.type == InputEventType.MouseUp) {
								this.inputStates_[a].isChanged = this.inputStates_[a].value != 0;
								this.inputStates_[a].value = 0;
								ev.consume();
							}
						}
					}
					break;
				case InputDeviceType.None:
					// no device bound to this action
					break;
				default:
					console.error("PlayerInputHandler: invalid device type ", this.bindings[a].device);
					break;
			}
		}
	}

	update(dt: number): void {
		if (!this.targetObj_) {
			return;
		}
		if (this.inputStates_[PlayerActions.MOVE_FORWARD].value) {
			this.targetObj_.move(Direction.FORWARD);
		}
		if (this.inputStates_[PlayerActions.MOVE_BACKWARD].value) {
			this.targetObj_.move(Direction.BACKWARD);
		}
		if (this.inputStates_[PlayerActions.MOVE_LEFT].value) {
			this.targetObj_.move(Direction.LEFT);
		}
		if (this.inputStates_[PlayerActions.MOVE_RIGHT].value) {
			this.targetObj_.move(Direction.RIGHT);
		}
		if (this.inputStates_[PlayerActions.MOVE_UP].value) {
			this.targetObj_.move(Direction.UP);
		}
		if (this.inputStates_[PlayerActions.MOVE_DOWN].value) {
			this.targetObj_.move(Direction.DOWN);
		}

		if (this.inputStates_[PlayerActions.RUN].isChanged) {
			this.targetObj_.toggleRun(this.inputStates_[PlayerActions.RUN].value != 0);
			this.inputStates_[PlayerActions.RUN].isChanged = false;
		}

		if (this.inputStates_[PlayerActions.ROTATE_YAW].value) {
			this.targetObj_.rotate(Direction.RIGHT, this.inputStates_[PlayerActions.ROTATE_YAW].value); // rotating RIGHT with negative angle rotates LEFT
			this.inputStates_[PlayerActions.ROTATE_YAW].value = 0;
		}
		if (this.inputStates_[PlayerActions.ROTATE_PITCH].value) {
			this.targetObj_.rotate(Direction.DOWN, this.inputStates_[PlayerActions.ROTATE_PITCH].value); // rotating DOWN with negative angle rotates UP
			this.inputStates_[PlayerActions.ROTATE_PITCH].value = 0;
		}

		for (let a = PlayerActions.TOGGLE_ACTIONS_FIRST; a < PlayerActions.TOGGLE_ACTIONS_LAST; a++) {
			if (this.inputStates_[a].isChanged) {
				this.targetObj_.setActionState(a, this.inputStates_[a].value != 0);
				this.inputStates_[a].isChanged = false;
			}
		}
	}

	/** set the target object to which actions are routed */
	setTargetObject(target: IUserControllable) {
		this.targetObj_ = target;
	}

	getTargetObject(): IUserControllable {
		return this.targetObj_;
	}

	// ------------------- PRIVATE AREA ---------------------- //
	private inputStates_: Record<PlayerActions, InputState> = {} as any;
	private targetObj_: IUserControllable;
}

class InputState {
	value = 0;
	isChanged = false;
}
