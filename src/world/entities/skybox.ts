import { RenderContext } from "../../joglr/render-context";
import { IRenderable } from "../../joglr/renderable";
import { Entity } from './../entity';
import { EntityType } from "./entity-types";

export class SkyBox extends Entity implements IRenderable {
	override getType(): EntityType {
		return EntityType.SkyBox;
	}

	render(context: RenderContext): void {
		// TODO implement
	}
}