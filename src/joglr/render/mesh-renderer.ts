import { VertexArrayObject } from "./vao";
import { checkGLError, gl } from "../glcontext";
import { IGLResource } from "../glresource";
import { Matrix } from "../math/matrix";
import { Mesh, MeshRenderModes, MeshVertex } from "../mesh";
import { RenderContext } from "./render-context";
import { Shaders } from "./shaders";

export class MeshRenderer implements IGLResource {
	private static instance_: MeshRenderer;
	static get(): MeshRenderer {
		return MeshRenderer.instance_;
	}

	static initialize(): Promise<void> {
		console.log("Initializing MeshRenderer...");
		MeshRenderer.instance_ = new MeshRenderer();
		return MeshRenderer.instance_.initialize();
	}

	release(): void {
		if (this.meshShaderProgram_) {
			gl.deleteProgram(this.meshShaderProgram_);
			this.meshShaderProgram_ = null;
		}
	}

	render(mesh: Mesh, worldTransform: Matrix, context: RenderContext): void {
		if (!this.meshShaderProgram_) {
			console.error("MeshRenderer.render(): Mesh shader is not loaded");
			return;
		}
		gl.useProgram(this.meshShaderProgram_);
		const matPV = context.viewport.camera().matProjView();

		const matPVW = matPV.mul(worldTransform);
		gl.uniformMatrix4fv(this.indexMatPVW_, false, matPVW.m);
		checkGLError("mPVW uniform setup");

		const vao: VertexArrayObject = mesh.getVAO();
		vao.bind();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.getIBO());
		if (mesh.vertexAttribsProgramBinding_ != this.meshShaderProgram_) {
			const stride = MeshVertex.getStride();
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.getVBO());
			vao.vertexAttribPointer(this.indexPos_, 3, gl.FLOAT, false, stride, MeshVertex.getOffset("position"));
			vao.vertexAttribPointer(this.indexNorm_, 3, gl.FLOAT, false, stride, MeshVertex.getOffset("normal"));
			vao.vertexAttribPointer(this.indexUV1_, 2, gl.FLOAT, false, stride, MeshVertex.getOffset("UV1"));
			vao.vertexAttribPointer(this.indexColor_, 4, gl.FLOAT, false, stride, MeshVertex.getOffset("color"));
			// gl.enableVertexAttribArray(this.indexPos_);
			// gl.enableVertexAttribArray(this.indexNorm_);
			// gl.enableVertexAttribArray(this.indexUV1_);
			// gl.enableVertexAttribArray(this.indexColor_); // TODO cleanup
			mesh.vertexAttribsProgramBinding_ = this.meshShaderProgram_;
			checkGLError("attrib arrays setup");
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

	private meshShaderProgram_: WebGLProgram;
	private indexPos_ = 0;
	private indexNorm_ = 0;
	private indexUV1_ = 0;
	private indexColor_ = 0;
	private indexMatPVW_: WebGLUniformLocation;

	private async initialize(): Promise<void> {
		await Shaders.createProgram(
			"/data/shaders/mesh.vert",
			"/data/shaders/mesh-texture.frag",
			(prog: WebGLProgram) => {
				this.meshShaderProgram_ = prog;
				this.indexPos_ = gl.getAttribLocation(this.meshShaderProgram_, "vPos");
				this.indexNorm_ = gl.getAttribLocation(this.meshShaderProgram_, "vNormal");
				this.indexUV1_ = gl.getAttribLocation(this.meshShaderProgram_, "vUV1");
				this.indexColor_ = gl.getAttribLocation(this.meshShaderProgram_, "vColor");
				this.indexMatPVW_ = gl.getUniformLocation(this.meshShaderProgram_, "mPVW");
				checkGLError("getAttribs");
			},
		);
		if (!this.meshShaderProgram_) {
			throw new Error("Failed to load mesh shader program");
		}
	}
}
