import { checkGLError, gl } from "../glcontext";
import { Matrix } from "../math/matrix";
import { Mesh, MeshRenderModes, MeshVertex } from "../mesh";
import { RenderContext } from "../render-context";
import { Shaders } from "../shaders";

export class MeshRenderer {
	private static instance_: MeshRenderer;
	static get(): MeshRenderer {
		return MeshRenderer.instance_;
	}

	static initialize(): Promise<void> {
		MeshRenderer.instance_ = new MeshRenderer();
		return MeshRenderer.instance_.initialize();
	}

	private meshShaderProgram_: WebGLProgram;
	private indexPos_ = 0;
	private indexNorm_ = 0;
	private indexUV1_ = 0;
	private indexColor_ = 0;
	private indexMatPVW_: WebGLUniformLocation;

	renderMesh(mesh: Mesh, worldTransform: Matrix, context: RenderContext): void {
		if (!this.meshShaderProgram_) {
			console.error("MeshRenderer.render(): Mesh shader is not loaded");
			return;
		}
		gl.useProgram(this.meshShaderProgram_);
		const matPV = context.activeViewport.camera().matProjView();

		const matPVW = matPV.mul(worldTransform);
		gl.uniformMatrix4fv(this.indexMatPVW_, false, matPVW.m);
		checkGLError("mPVW uniform setup");

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.VBO_);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.IBO_);
		gl.enableVertexAttribArray(this.indexPos_);
		gl.enableVertexAttribArray(this.indexNorm_);
		gl.enableVertexAttribArray(this.indexUV1_);
		gl.enableVertexAttribArray(this.indexColor_);
		gl.vertexAttribPointer(this.indexPos_, 3, gl.FLOAT, false, MeshVertex.getSize(), MeshVertex.getOffset("position"));
		gl.vertexAttribPointer(this.indexNorm_, 3, gl.FLOAT, false, MeshVertex.getSize(), MeshVertex.getOffset("normal"));
		gl.vertexAttribPointer(this.indexUV1_, 2, gl.FLOAT, false, MeshVertex.getSize(), MeshVertex.getOffset("UV1"));
		gl.vertexAttribPointer(this.indexColor_, 4, gl.FLOAT, false, MeshVertex.getSize(), MeshVertex.getOffset("color"));
		checkGLError("attrib arrays setup");

		// decide what to draw:
		let drawMode = 0;
		switch (mesh.mode_) {
			case MeshRenderModes.Points:
				drawMode = gl.POINTS; break;
			case MeshRenderModes.Lines:
				drawMode = gl.LINES; break;
			case MeshRenderModes.Triangles:
				drawMode = gl.TRIANGLES; break;
			default:
				throw new Error(`Unknown mesh draw mode ${mesh.mode_}`);
		}
		if (mesh.mode_ == MeshRenderModes.Lines) {
			gl.lineWidth(2.0);
		}
		gl.drawElements(drawMode, mesh.indexCount_, gl.UNSIGNED_SHORT, 0);
		checkGLError("mesh draw");
		if (mesh.mode_ == MeshRenderModes.Lines) {
			gl.lineWidth(1.0);
		}
	}

	private async initialize() {
		const meshVertexShaderCode: string = await (await fetch("/data/shaders/mesh.vert")).text();
		const meshFragmentShaderCode: string = await (await fetch("/data/shaders/mesh-texture.frag")).text();
		this.meshShaderProgram_ =  Shaders.createProgram(meshVertexShaderCode, meshFragmentShaderCode);
		this.indexPos_ = gl.getAttribLocation(this.meshShaderProgram_, "vPos");
		this.indexNorm_ = gl.getAttribLocation(this.meshShaderProgram_, "vNormal");
		this.indexUV1_ = gl.getAttribLocation(this.meshShaderProgram_, "vUV1");
		this.indexColor_ = gl.getAttribLocation(this.meshShaderProgram_, "vColor");
		this.indexMatPVW_ = gl.getUniformLocation(this.meshShaderProgram_, "mPVW");
		checkGLError("getAttribs");
	}
};