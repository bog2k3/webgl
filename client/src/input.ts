export enum InputEventType {
	MouseMoved = "mouse_moved",
	MouseDown = "mouse_down",
	MouseUp = "mouse_up",
	MouseWheel = "mouse_scroll",
	KeyDown = "key_down",
	KeyUp = "key_up",
	KeyChar = "key_char",
}

export enum MouseButton {
	None = -1,
	Left = 0,
	Middle = 1,
	Right = 2,
}

export class InputEvent {
	type: InputEventType;
	x = 0;
	y = 0;
	dx = 0;
	dy = 0;
	/** wheel rotation. Negative is up, positive is down. */
	dz = 0;
	mouseButton = MouseButton.None;
	/**
	 * See this URL for a list of key codes:
	 * https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
	 */
	keyCode: string;
	char: string;

	constructor(data: Partial<InputEvent>) {
		Object.assign(this, data);
	}

	consume(): void {
		this.consumed = true;
	}

	isConsumed(): boolean {
		return this.consumed;
	}

	private consumed = false;
}

export class HtmlInputHandler {
	constructor(private readonly targetElement: HTMLElement) {
		targetElement.onkeydown = (ev: KeyboardEvent) => this.handleKeyboardEvent(ev);
		targetElement.onkeyup = (ev: KeyboardEvent) => this.handleKeyboardEvent(ev);
		targetElement.onmousedown = (ev: MouseEvent) => this.handleMouseEvent(ev);
		targetElement.onmouseup = (ev: MouseEvent) => this.handleMouseEvent(ev);
		targetElement.onmousemove = (ev: MouseEvent) => this.handleMouseEvent(ev);
		targetElement["onmousewheel"] = (ev: MouseEvent) => this.handleMouseEvent(ev);
	}

	/**
	 * Returns input events that accumulated since the last call to this function.
	 */
	getEvents(): InputEvent[] {
		return this.eventQueue.splice(0);
	}

	/** Clears the event queue. Useful afer a blocking loading, to avoid mouse jumps */
	clear(): void {
		this.eventQueue.splice(0);
	}

	// ------------------- PRIVATE AREA ----------------- //
	private eventQueue: InputEvent[] = [];

	private handleKeyboardEvent(ev: KeyboardEvent): void {
		this.eventQueue.push(
			new InputEvent({
				type: ev.type == "keydown" ? InputEventType.KeyDown : InputEventType.KeyUp,
				keyCode: ev.code,
			}),
		);
		if (ev.type == "keydown" && this.isCharacterKeyPress(ev)) {
			this.eventQueue.push(
				new InputEvent({
					type: InputEventType.KeyChar,
					char: ev.key,
				}),
			);
		}
	}

	private handleMouseEvent(ev: MouseEvent): void {
		const [x, y] = this.extractLocalMouseCoords(ev);
		switch (ev.type) {
			case "mousedown":
			case "mouseup":
				this.eventQueue.push(
					new InputEvent({
						type: ev.type == "mousedown" ? InputEventType.MouseDown : InputEventType.MouseUp,
						mouseButton: ev.button,
						x,
						y,
					}),
				);
				break;
			case "mousemove":
				this.eventQueue.push(
					new InputEvent({
						type: InputEventType.MouseMoved,
						x,
						y,
						dx: ev.movementX,
						dy: ev.movementY,
					}),
				);
				break;
			case "mousewheel":
				this.eventQueue.push(
					new InputEvent({
						type: InputEventType.MouseWheel,
						x,
						y,
						dz: Math.sign(ev["deltaY"]),
					}),
				);
				break;
		}
	}

	private extractLocalMouseCoords(ev: MouseEvent): number[] {
		const rect = this.targetElement.getBoundingClientRect();
		const localX = ev.clientX - rect.left;
		const localY = ev.clientY - rect.top;
		return [localX, localY];
	}

	private isCharacterKeyPress(ev: KeyboardEvent): boolean {
		if (typeof ev.which == "undefined") {
			// This is IE, which only fires keypress events for printable keys
			return true;
		} else if (typeof ev.which == "number" && ev.which > 0) {
			// In other browsers except old versions of WebKit, ev.which is
			// only greater than zero if the keypress is a printable key.
			// We need to filter out backspace and ctrl/alt/meta key combinations
			return !ev.ctrlKey && !ev.metaKey && !ev.altKey && ev.which != 8;
		}
		return false;
	}
}
