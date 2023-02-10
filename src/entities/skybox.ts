import { RenderContext } from "../joglr/render/render-context";
import { IRenderable } from "../joglr/render/renderable";
import { Entity } from "../joglr/world/entity";
import { EntityType } from "./entity-types";

export class SkyBox extends Entity implements IRenderable {
	override getType(): EntityType {
		return EntityType.SkyBox;
	}

	render(context: RenderContext): void {
		// TODO implement
	}
}
