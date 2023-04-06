import { AABB } from "../math/aabb";
import { Transform } from "../math/transform";
import { Event } from "../utils/event";
import { World } from "./world";
export abstract class Entity {
	onDestroyed = new Event<(this: this) => void>();

	destroy(): void {
		if (this.isDestroyed_) {
			return;
		}
		this.isDestroyed_ = true;
		World.getInstance().removeEntity(this);
		this.onDestroyed.trigger(this);
	}

	isDestroyed(): boolean {
		return this.isDestroyed_;
	}

	abstract getType(): string;

	abstract getAABB(): AABB;

	getTransform(frameName = "root"): Transform {
		if (frameName === "root") {
			return this.rootTransform;
		} else {
			return this.getFrameTransform(frameName);
		}
	}

	setAttribute(name: string, value: any): void {
		this.attributes[name] = value;
	}

	getAttribute(name: string): any {
		return this.attributes[name];
	}

	protected getFrameTransform(frameName: string): Transform {
		throw new Error("This method must be overridden.");
	}

	/** Use this to create physics bodies and whatever else */
	protected handleAddedToWorld(): void {}
	/** Use this to remove physics bodies from world */
	protected handleRemovedFromWorld(): void {}

	protected rootTransform = new Transform();

	private isDestroyed_ = false;

	private attributes: Record<string, any> = {};
}
