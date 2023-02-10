export class Event<CALLBACK_TYPE> {

	/** Adds a new subscriber to the event and returns the subscriber id; The id can be used later to remove the subscriber */
	add(fn: CALLBACK_TYPE): number {
		this.subscribers_.push(fn);
		return this.subscribers_.length - 1;
	}

	remove(id: number): void {
		if (id < 0 || id >= this.subscribers_.length || Math.floor(id) !== id) {
			throw new Error("Invalid id specified in Event.remove()");
		}
		if (!this.subscribers_[id]) {
			throw new Error(`Subscription with id ${id} not found in event`);
		}
		this.subscribers_[id] = null;
	}

	/** Forwards this event to another one of the same type. After this, when this is triggered, the other event will be triggered too. */
	forward(target: Event<CALLBACK_TYPE>): void {
		this.forwardedTarget_ = target;
	}

	/** Clears all subscribers for this event, as well as any forwarding. */
	clear(): void {
		this.subscribers_ = [];
		this.forwardedTarget_ = null;
	}

	/** Triggers this event, optionally with arguments that will be passed to the subscribers */
	trigger(...args): void {
		if (this.forwardedTarget_) {
			this.forwardedTarget_.trigger(...args);
		}
		for (let s of this.subscribers_) {
			if (s) {
				s["call"](null, ...args);
			}
		}
	}

	private subscribers_: CALLBACK_TYPE[] = [];
	private forwardedTarget_: Event<CALLBACK_TYPE> = null;
}