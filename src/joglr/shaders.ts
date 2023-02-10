import { checkGLError, gl } from "./glcontext";

export namespace Shaders {

	export enum Type {
		Vertex = "vertex",
		Fragment = "fragment"
	}

	export type ShaderCallback = (shader: WebGLShader) => void;
	export type ProgramCallback = (prog: WebGLProgram) => void;
	export type ShaderPreprocessor = (code: string, originalPath: string) => Promise<string>;

	export function useShaderPreprocessor(preprocessor: ShaderPreprocessor) {
		shaderPreprocessor_ = preprocessor;
	}

	export async function loadVertexShader(path: string, callback: ShaderCallback): Promise<void> {
		const shaderCode: string = await loadShaderFile(path);
		if (shaderCode == "") {
			callback(null);
			return;
		}
		console.log(`Compiling shader : ${path} . . . `);
		const shader: WebGLShader = createAndCompileShader(shaderCode, Type.Vertex);
		loadedShaders_.push(<ShaderDesc>{
			shaderType: Type.Vertex,
			shader,
			path,
			callback
		});
		callback(shader);
	}

	export async function loadFragmentShader(path: string, callback: ShaderCallback): Promise<void> {
		const shaderCode: string = await loadShaderFile(path);
		if (shaderCode == "") {
			callback(null);
			return;
		}
		console.log(`Compiling shader : ${path} . . . `);
		const shader: WebGLShader = createAndCompileShader(shaderCode, Type.Fragment);
		loadedShaders_.push(<ShaderDesc>{
			shaderType: Type.Fragment,
			shader,
			path,
			callback
		});
		callback(shader);
	}

	export function createAndCompileShader(code: string, shaderType: Type): WebGLShader | null {
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
			console.error("Compiling shader failed: \n" + errorLog);
			return null;
		}
		return shader;
	}

	export async function createProgram(vertexShaderPath: string, fragmentShaderPath: string, callback: ProgramCallback): Promise<void> {
		// Create the shaders
		let vertexShader: WebGLShader = null;
		let vertexDescIdx = -1;
		let fragmentShader: WebGLShader = null;
		let fragmentDescIdx = -1;
		await loadVertexShader(vertexShaderPath, (shader) => {
			vertexShader = shader;
			vertexDescIdx = loadedShaders_.length - 1;
		});
		if (vertexDescIdx >= 0) {
			loadedShaders_[vertexDescIdx].callback = null;
		}
		await loadFragmentShader(fragmentShaderPath, (shader) => {
			fragmentShader = shader;
			fragmentDescIdx = loadedShaders_.length - 1;
		});
		if (fragmentDescIdx >= 0) {
			loadedShaders_[fragmentDescIdx].callback = null;
		}

		if (!vertexShader || !fragmentShader) {
			console.warn(`Some shaders failed ["${vertexShaderPath}", "${fragmentShaderPath}"]. Aborting...`);
			callback(null);
			return;
		}

		const prog: WebGLProgram = linkProgram(vertexShader, fragmentShader);
		gl.deleteShader(vertexShader);
		loadedShaders_[vertexDescIdx].shader = null;
		gl.deleteShader(fragmentShader);
		loadedShaders_[fragmentDescIdx].shader = null;

		loadedPrograms_.push(<ProgramDesc>{
			program: prog,
			fragDescIdx: fragmentDescIdx,
			vertexDescIdx: vertexDescIdx,
			callback
		});

		callback(prog);
	}

	export async function reloadAllShaders(): Promise<void> {
		console.log("Reloading all shaders...");
		await Promise.all(loadedShaders_.map(async s => {
			if (!s) {
				return;
			}
			if (s.shader) {
				gl.deleteShader(s.shader);
				s.shader = null;
			}
			const shaderCode: string = await loadShaderFile(s.path);
			s.shader = createAndCompileShader(shaderCode, s.shaderType);
			if (s.callback && s.shader) {
				s.callback(s.shader);
			}
		}));
		await Promise.all(loadedPrograms_.map(async p => {
			if (!p) {
				return;
			}
			if (p.program) {
				gl.deleteProgram(p.program);
			}
			p.program = linkProgram(
				p.vertexDescIdx >= 0 ? loadedShaders_[p.vertexDescIdx] : null,
				p.fragDescIdx >= 0 ? loadedShaders_[p.fragDescIdx]: null
			);
			if (p.callback && p.program) {
				p.callback(p.program);
			}
		}));
	}

	export function deleteProgram(prog: WebGLProgram): void {
		if (!prog) {
			return;
		}
		for (let p of loadedPrograms_) {
			if (p.program !== prog) {
				continue;
			}
			gl.deleteProgram(p.program);
			p.program = null;
			p.callback = null;
			if (p.vertexDescIdx >= 0) {
				deleteLoadedShader(p.vertexDescIdx);
			}
			if (p.fragDescIdx >= 0) {
				deleteLoadedShader(p.fragDescIdx);
			}
			p = null;
			break;
		}
	}

	// --------------------- PRIVATE AREA ------------------------ //

	class ShaderDesc {
		shaderType: Type;
		shader: WebGLShader;
		path: string;
		callback: (shader: WebGLShader) => void;
	};

	class ProgramDesc {
		program: WebGLProgram = null;
		vertexDescIdx = -1;
		fragDescIdx = -1;
		callback: (programId: WebGLProgram) => void;
	};

	let shaderPreprocessor_: ShaderPreprocessor = null;
	const loadedShaders_: ShaderDesc[] = [];
	const loadedPrograms_: ProgramDesc[] = [];

	function shaderTypeToGL(type: Type): number {
		switch (type) {
			case Type.Vertex: return gl.VERTEX_SHADER;
			case Type.Fragment: return gl.FRAGMENT_SHADER;
			default: throw new Error(`Invalid WebGL shader type ${type}`);
		}
	}

	async function loadShaderFile(path: string): Promise<string> {
		let shaderCode: string = await (await fetch(path)).text()
			.catch(err => {
				console.error(`Failed to load shader ${path}: `, err);
				return "";
			});
		if (shaderPreprocessor_) {
			shaderCode = await shaderPreprocessor_(shaderCode, path);
			if (!shaderCode) {
				console.error(`Failed to preprocess shader ${path}`);
			}
		}
		return shaderCode;
	}

	function linkProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
		console.log('Linking WebGL program...');
		const prog: WebGLProgram = gl.createProgram();
		gl.attachShader(prog, vertexShader);
		gl.attachShader(prog, fragmentShader);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS) || checkGLError("linking shader program")) {
			console.error("Failed to link shader program: " + gl.getProgramInfoLog(prog));
			return null;
		}
		gl.validateProgram(prog);
		if (!gl.getProgramParameter(prog, gl.VALIDATE_STATUS) || checkGLError("validating shader program")) {
			console.error("Failed to validate shader program: " + gl.getProgramInfoLog(prog));
			return null;
		}
	}

	function deleteLoadedShader(shaderIndex: number): void {
		if (loadedShaders_[shaderIndex]) {
			gl.deleteShader(loadedShaders_[shaderIndex].shader);
			loadedShaders_[shaderIndex].callback = null;
			loadedShaders_[shaderIndex].shader = null;
			loadedShaders_[shaderIndex] = null;
		}
	}
}

