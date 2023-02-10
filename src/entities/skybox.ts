import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { Entity } from "../joglfw/world/entity";
import { EntityTypes } from "./entity-types";

export class SkyBox extends Entity implements IRenderable {
	override getType(): string {
		return EntityTypes.SkyBox;
	}

	render(context: RenderContext): void {
		// TODO implement
	}
}
