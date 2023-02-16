import { VertexArrayObject } from "./vao";
import { checkGLError, gl } from "../glcontext";
import { IGLResource } from "../glresource";
import { Matrix } from "../math/matrix";
import { Mesh, MeshRenderModes, MeshVertex } from "../mesh";
import { RenderContext } from "./render-context";
import { Shaders } from "./shaders";
import { logprefix } from "../log";

const console = logprefix("MeshRenderer");

export class MeshRenderer implements IGLResource {
	private static instance: MeshRenderer;
	static get(): MeshRenderer {
		return MeshRenderer.instance;
	}

	static async initialize(): Promise<void> {
		console.log("Initializing...");
		MeshRenderer.instance = new MeshRenderer();
		await MeshRenderer.instance.initialize();
		console.log("Ready.");
	}

	release(): void {
		if (this.meshShaderProgram) {
			gl.deleteProgram(this.meshShaderProgram);
			this.meshShaderProgram = null;
		}
	}

	render(mesh: Mesh, worldTransform: Matrix, context: RenderContext): void {
		if (!this.meshShaderProgram) {
			console.error("render(): Mesh shader is not loaded");
			return;
		}
		gl.useProgram(this.meshShaderProgram);
		const matVP = context.viewport.camera().matViewProj();

		const matWVP = worldTransform.mul(matVP);
		gl.uniformMatrix4fv(this.indexMatWVP, false, matWVP.getColumnMajorValues());
		checkGLError("mWVP uniform setup");

		const vao: VertexArrayObject = mesh.VAO;
		vao.bind();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.IBO);
		if (mesh.vertexAttribsProgramBinding_ != this.meshShaderProgram) {
			const stride = MeshVertex.getStride();
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.VBO);
			vao.vertexAttribPointer(this.indexPos, 3, gl.FLOAT, false, stride, MeshVertex.getOffset("position"));
			vao.vertexAttribPointer(this.indexNorm, 3, gl.FLOAT, false, stride, MeshVertex.getOffset("normal"));
			vao.vertexAttribPointer(this.indexUV1, 2, gl.FLOAT, false, stride, MeshVertex.getOffset("UV1"));
			vao.vertexAttribPointer(this.indexColor, 4, gl.FLOAT, false, stride, MeshVertex.getOffset("color"));
			mesh.vertexAttribsProgramBinding_ = this.meshShaderProgram;
			checkGLError("mesh renderer attrib arrays setup");
		}

		// decide what to draw:
		let drawMode = 0;
		switch (mesh.getRenderMode()) {
			case MeshRenderModes.Points:
				drawMode = gl.POINTS;
				break;
			case MeshRenderModes.Lines:
				drawMode = gl.LINES;
				break;
			case MeshRenderModes.Triangles:
				drawMode = gl.TRIANGLES;
				break;
			default:
				throw new Error(`Unknown mesh draw mode ${mesh.getRenderMode()}`);
		}
		if (mesh.getRenderMode() == MeshRenderModes.Lines) {
			gl.lineWidth(2.0);
		}
		gl.drawElements(drawMode, mesh.getElementsCount(), gl.UNSIGNED_SHORT, 0);
		checkGLError("mesh draw");
		if (mesh.getRenderMode() == MeshRenderModes.Lines) {
			gl.lineWidth(1.0);
		}
	}

	// ------------- PRIVATE AREA ------------------- //
	protected constructor() {}

	private meshShaderProgram: WebGLProgram;
	private indexPos = 0;
	private indexNorm = 0;
	private indexUV1 = 0;
	private indexColor = 0;
	private indexMatWVP: WebGLUniformLocation;

	private async initialize(): Promise<void> {
		await Shaders.createProgram(
			"/data/shaders/mesh.vert",
			"/data/shaders/mesh-texture.frag",
			(prog: WebGLProgram) => {
				this.meshShaderProgram = prog;
				this.indexPos = gl.getAttribLocation(this.meshShaderProgram, "vPos");
				this.indexNorm = gl.getAttribLocation(this.meshShaderProgram, "vNormal");
				this.indexUV1 = gl.getAttribLocation(this.meshShaderProgram, "vUV1");
				this.indexColor = gl.getAttribLocation(this.meshShaderProgram, "vColor");
				this.indexMatWVP = gl.getUniformLocation(this.meshShaderProgram, "mWVP");
				checkGLError("getAttribs");
			},
		);
		if (!this.meshShaderProgram) {
			throw new Error("Failed to load mesh shader program");
		}
	}
}
