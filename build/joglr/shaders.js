import { checkGLError, gl } from "./glcontext";
export var Shaders;
(function (Shaders) {
    let Type;
    (function (Type) {
        Type["Vertex"] = "vertex";
        Type["Fragment"] = "fragment";
    })(Type = Shaders.Type || (Shaders.Type = {}));
    function createAndCompileShader(code, shaderType) {
        const shader = gl.createShader(shaderTypeToGL(shaderType));
        if (!shader || checkGLError("create shader"))
            throw new Error(`Could not create shader of type ${shaderType}`);
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        checkGLError("compile shader");
        const result = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!result) {
            const errorLog = gl.getShaderInfoLog(shader);
            throw new Error("Compiling shader failed: \n" + errorLog);
        }
        return shader;
    }
    Shaders.createAndCompileShader = createAndCompileShader;
    function createProgram(vertexShaderCode, fragmentShaderCode) {
        const vertexShader = createAndCompileShader(vertexShaderCode, Type.Vertex);
        const fragmentShader = createAndCompileShader(vertexShaderCode, Type.Fragment);
        const prog = gl.createProgram();
        gl.attachShader(prog, vertexShader);
        gl.attachShader(prog, fragmentShader);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS) || checkGLError("linking shader program")) {
            throw new Error("Failed to link shader program: " + gl.getProgramInfoLog(prog));
        }
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        return prog;
    }
    Shaders.createProgram = createProgram;
    function shaderTypeToGL(type) {
        switch (type) {
            case Type.Vertex: return gl.VERTEX_SHADER;
            case Type.Fragment: return gl.FRAGMENT_SHADER;
            default: throw new Error(`Invalid WebGL shader type ${type}`);
        }
    }
})(Shaders || (Shaders = {}));
//# sourceMappingURL=shaders.js.map