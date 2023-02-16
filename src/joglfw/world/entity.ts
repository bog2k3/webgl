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

	getTransform(): Transform {
		return this.transform;
	}

	protected transform = new Transform();

	private isDestroyed_ = false;
}
