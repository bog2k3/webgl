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

	private isDestroyed_ = false;
}
