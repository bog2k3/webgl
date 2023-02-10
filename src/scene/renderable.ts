import { RenderContext } from "../joglr/render-context";

export interface IRenderable {
	render(context: RenderContext): void;
}