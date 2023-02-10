export let gl: WebGL2RenderingContext | WebGLRenderingContext;

export function setGl(gl_: WebGL2RenderingContext | WebGLRenderingContext): void {
	gl = gl_;
}
