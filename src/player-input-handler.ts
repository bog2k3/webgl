import { IUserControllable } from "./entities/user-controllable";
import { InputEvent, MouseButton } from "./input";
import { IUpdatable } from "./joglr/world/updateable";

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

	CUSTOM_ACTION_1,
	CUSTOM_ACTION_2,
	CUSTOM_ACTION_3,
	CUSTOM_ACTION_4,
	CUSTOM_ACTION_5,

	CUSTOM_ACTION_LAST,

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

		this.bindings[PlayerActions.CUSTOM_ACTION_1] = new KeyBindingDescriptor({
			device: InputDeviceType.Mouse,
			code: MouseButton.Left,
			analog: false,
		});
	}

	handleInputEvent(ev: InputEvent): boolean {
		return false;
	}

	update(dt: number): void {}

	/** set the target object to which actions are routed */
	setTargetObject(target: IUserControllable) {
		this.targetObj_ = target;
	}

	// ------------------- PRIVATE AREA ---------------------- //
	private inputStates_: Record<PlayerActions, InputState> = {} as any;
	private targetObj_: IUserControllable;
}

class InputState {
	value = 0;
	isChanged = false;
}
