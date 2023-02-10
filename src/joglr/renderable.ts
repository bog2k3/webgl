import { RenderContext } from "./render-context";

export interface IRenderable {
	render(context: RenderContext): void;
}

export function isRenderable(x): x is IRenderable {
	return "render" in x;
}