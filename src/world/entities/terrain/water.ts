import { IGLResource } from "../../../joglr/glresource";
import { RenderContext } from "../../../joglr/render-context";
import { IRenderable } from "../../renderable";
import { Entity } from './../../entity';

export class WaterParams {
	innerRadius = 50.0;			// radius of 'detailed' water mesh -> should cover the playable area
	outerExtent = 100.0;		// extend from the innerRadius to make the water appear infinite - this area will have fewer vertices
	vertexDensity = 0.1;		// vertices per meter
	constrainToCircle = false;	// true to enable detailed vertex generation only within the circle of radius 'innerRadius'
								// if false, a square of length 2*innerRadius will be used instead (faster)
};
export class Water extends Entity implements IRenderable, IGLResource {

	release(): void {
		// TODO: implement
	}

	render(context: RenderContext): void {
		// TODO: implement
	}

	generate(params: WaterParams): void {

	}
}
