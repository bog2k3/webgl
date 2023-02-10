import { IGLResource } from "../../../joglr/glresource";
import { RenderContext } from "../../../joglr/render-context";
import { IRenderable } from "../../renderable";
import { Entity } from './../../entity';

export class Water extends Entity implements IRenderable, IGLResource {

	release(): void {
		// TODO: implement
	}

	render(context: RenderContext): void {
		// TODO: implement
	}
}