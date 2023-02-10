import { checkGLError, gl } from "./glcontext";

export namespace Shaders {

	export enum Type {
		Vertex = "vertex",
		Fragment = "fragment"
	}

	export function createAndCompileShader(code: string, shaderType: Type): WebGLShader {
		const shader: WebGLShader = gl.createShader(shaderTypeToGL(shaderType));
		if (!shader || checkGLError("create shader"))
			throw new Error(`Could not create shader of type ${shaderType}`);

		// Compile Shader
		gl.shaderSource(shader, code);
		gl.compileShader(shader);
		checkGLError("compile shader");

		// Check Shader
		const result = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (!result) {
			const errorLog: string = gl.getShaderInfoLog(shader);
			throw new Error("Compiling shader failed: \n" + errorLog);
		}
		return shader;
	}

	export function createProgram(vertexShaderCode: string, fragmentShaderCode: string): WebGLProgram {
		// Create the shaders
		const vertexShader: WebGLShader = createAndCompileShader(vertexShaderCode, Type.Vertex);
		const fragmentShader: WebGLShader = createAndCompileShader(fragmentShaderCode, Type.Fragment);
		const prog: WebGLProgram = gl.createProgram();
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

	function shaderTypeToGL(type: Type): number {
		switch (type) {
			case Type.Vertex: return gl.VERTEX_SHADER;
			case Type.Fragment: return gl.FRAGMENT_SHADER;
			default: throw new Error(`Invalid WebGL shader type ${type}`);
		}
	}
}