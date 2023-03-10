import { AABB } from "../math/aabb";
import { Transform } from "../math/transform";
import { World } from "./world";
export abstract class Entity {
	destroy(): void {
		this.isDestroyed_ = true;
		World.getInstance().removeEntity(this);
	}

	isDestroyed(): boolean {
		return this.isDestroyed_;
	}

	abstract getType(): string;

	abstract getAABB(): AABB;

	protected getFrameTransform(frameName: string): Transform {
		throw new Error("This method must be overridden.");
	}

	getTransform(frameName = "root"): Transform {
		if (frameName === "root") {
			return this.rootTransform;
		} else {
			return this.getFrameTransform(frameName);
		}
	}

	protected rootTransform = new Transform();

	private isDestroyed_ = false;
}
