export let gl;
export function setGl(gl_) {
    gl = gl_;
}
export function checkGLError(operationName) {
    let errorDetected = false;
    let err;
    do {
        err = gl.getError();
        if (err != gl.NO_ERROR) {
            console.error(`GL error in ["${operationName ?? ""}"] code 0x${err.toString(16)}`);
            errorDetected = true;
        }
    } while (err != gl.NO_ERROR);
    return errorDetected;
}
//# sourceMappingURL=glcontext.js.map