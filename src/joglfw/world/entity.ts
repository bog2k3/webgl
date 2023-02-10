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

	getTransform(): Transform {
		return this.transform_;
	}

	protected transform_ = new Transform();

	private isDestroyed_ = false;
}
