export let gl: WebGL2RenderingContext | WebGLRenderingContext;

export function setGl(gl_: WebGL2RenderingContext | WebGLRenderingContext): void {
	gl = gl_;
}

/** returns true if an error was detected */
export function checkGLError(operationName: string): boolean {
	let errorDetected = false;
	let err: GLenum;
	do {
		err = gl.getError();
		if (err != gl.NO_ERROR) {
			console.error(`GL error in ["${operationName ?? ""}"] code 0x${err.toString(16)}`);
			errorDetected = true;
		}
	} while (err != gl.NO_ERROR);
	return errorDetected;
}