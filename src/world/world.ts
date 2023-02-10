import { Entity } from './entity';
import { RenderContext } from './../joglr/render-context';
import { IRenderable, isRenderable } from "./renderable";
import { isUpdatable, IUpdatable } from "./updateable";

export class World implements IRenderable, IUpdatable {
	constructor() {}

	update(dt: number): void {
		for (let e of this.entities) {
			if (isUpdatable(e)) {
				e.update(dt);
			}
		}
	}

	render(context: RenderContext): void {
		for (let e of this.entities) {
			if (isRenderable(e)) {
				e.render(context);
			}
		}
	}

	addEntity(e: Entity): void {
		this.entities.push(e);
	}

	destroyEntity(e: Entity): void {
		e.destroy();
		this.entities.splice(this.entities.indexOf(e), 1);
	}

	// --------------------- PRIVATE AREA --------------------- //

	entities: Entity[] = [];
}
