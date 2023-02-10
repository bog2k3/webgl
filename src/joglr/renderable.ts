import { RenderContext } from "./render-context";

export interface IRenderable {
	render(context: RenderContext): void;
}