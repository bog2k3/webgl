import { checkGLError, gl } from "../glcontext";
import { IGLResource } from "../glresource";
import { logprefix } from "../log";
import { AABB } from "../math/aabb";
import { Matrix } from "../math/matrix";
import { Vector } from "../math/vector";
import { assert } from "../utils/assert";
import { AbstractVertex } from "./abstract-vertex";
import { Shaders } from "./shaders";
import { VertexArrayObject } from "./vao";

const console = logprefix("ShapeRenderer");

export class ShapeRenderer implements IGLResource {
	private static instance_: ShapeRenderer = null;
	static get(): ShapeRenderer {
		assert(ShapeRenderer.instance_ != null, "ShapeRenderer has not been initialized.");
		return ShapeRenderer.instance_;
	}

	static async initialize(): Promise<void> {
		console.log("Initializing...");
		ShapeRenderer.instance_ = new ShapeRenderer();
		await ShapeRenderer.instance_.initialize();
		console.log("Ready.");
	}

	release(): void {
		if (this.shapeShaderProgram) {
			gl.deleteProgram(this.shapeShaderProgram);
			this.shapeShaderProgram = null;
		}
		this.VAO.release();
		this.VAO = null;
		if (this.VBO) {
			gl.deleteBuffer(this.VBO);
			this.VBO = null;
		}
		if (this.IBO) {
			gl.deleteBuffer(this.IBO);
			this.IBO = null;
		}
	}

	// draw a single line segment
	queueLine(point1: Vector, point2: Vector, rgba: Vector): void {}
	// draw a list of separate lines (pairs of two vertices)
	queueLineList(verts: Vector[], rgba: Vector): void {}
	// draw a line strip (connected lines)
	queueLineStrip(verts: Vector[], rgba: Vector): void {}

	// draw a polygon
	queuePolygon(verts: Vector[], rgba: Vector): void {}

	queueAABB(aabb: AABB, rgba: Vector): void {}

	// sets a transform matrix that will affect all future drawXXX calls
	setTransform(mat: Matrix): void {
		this.transform_ = mat;
		this.transformActive_ = true;
	}

	resetTransform(): void {
		this.transformActive_ = false;
	}

	/** Renders all queued items and clears the queue. */
	renderAll(): void {
		if (!lineShaderProgram_)
			return;

		Viewport* pCrtViewport = RenderHelpers::getActiveViewport();
		if (!pCrtViewport) {
			assertDbg(!!!"No viewport is currently rendering!");
			return;
		}

		unsigned nIndices = indices_.size();
		if (!nIndices)
			return;

		// update render buffers:
		glBindBuffer(GL_ARRAY_BUFFER, VBO_);
		glBufferData(GL_ARRAY_BUFFER, sizeof(s_vertex) * buffer_.size(), &buffer_[0], GL_DYNAMIC_DRAW);
		glBindBuffer(GL_ARRAY_BUFFER, 0);
		glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, IBO_);
		glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices_[0]) * indices_.size(), &indices_[0], GL_DYNAMIC_DRAW);
		glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);

		glEnable(GL_BLEND);
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
		//glBlendEquation(GL_BLEND_EQUATION_ALPHA);

		glUseProgram(lineShaderProgram_);
		glBindVertexArray(VAO_);
		auto mPV = pCrtViewport->camera().matProjView();
		glUniformMatrix4fv(indexMatProjView_, 1, GL_FALSE, glm::value_ptr(mPV));
		checkGLError("Shape3D::setupVAOandUnif");

		glDrawElements(GL_LINES, nIndices, GL_UNSIGNED_INT, 0);
		checkGLError("Shape3D::glDrawElements");

		glDisable(GL_BLEND);
		glBindVertexArray(0);

		// purge cached data:
		buffer_.clear();
		indices_.clear();
	}

	// ------------- PRIVATE AREA ------------------- //
	protected constructor() {}

	private shapeShaderProgram: WebGLProgram;
	private indexPos = 0;
	private indexColor = 0;
	private indexMatViewProj: WebGLUniformLocation;
	private VAO: VertexArrayObject;
	private VBO: WebGLBuffer;
	private IBO: WebGLBuffer;

	// line buffers
	buffer_: ShapeVertex[] = [];
	indices_ = new Uint16Array(1000);
	transform_ = Matrix.identity();
	transformActive_ = false;

	private async initialize(): Promise<void> {
		this.VAO = new VertexArrayObject();
		this.VBO = gl.createBuffer();
		this.IBO = gl.createBuffer();
		await Shaders.createProgram(
			"/data/shaders/shape3d.vert",
			"/data/shaders/shape3d.frag",
			(prog: WebGLProgram) => {
				this.shapeShaderProgram = prog;
				this.indexMatViewProj = gl.getUniformLocation(this.shapeShaderProgram, "mVP");
				this.indexPos = gl.getAttribLocation(this.shapeShaderProgram, "vPos");
				this.indexColor = gl.getAttribLocation(this.shapeShaderProgram, "vColor");
				checkGLError("getAttribs");

				this.VAO.bind();
				gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IBO);
				this.VAO.vertexAttribPointer(
					this.indexPos,
					3,
					gl.FLOAT,
					false,
					ShapeVertex.getStride(),
					ShapeVertex.getOffset("pos"),
				);
				this.VAO.vertexAttribPointer(
					this.indexColor,
					4,
					gl.FLOAT,
					false,
					ShapeVertex.getStride(),
					ShapeVertex.getOffset("rgba"),
				);
				this.VAO.unbind();
			},
		);
		if (!this.shapeShaderProgram) {
			throw new Error("Failed to load mesh shader program");
		}
	}

	transform(verts: Vector[]): void {
		if (!this.transformActive_) {
			return;
		}
		for (let v of verts) {
			v.w = 1;
			v.mulInPlace(this.transform_);
			v.w = 0;
		}
	}
}

class ShapeVertex extends AbstractVertex {
	pos: Vector; // 3
	rgba: Vector; // 4 (color)

	static getStride(): number {
		return 4 * (3 + 4);
	}

	/** returns the offset of a component, in number of bytes */
	static getOffset(field: keyof ShapeVertex): number {
		switch (field) {
			case "pos":
				return 4 * 0;
			case "rgba":
				return 4 * 3;
			default:
				throw new Error(`Invalid field specified in ShapeVertex.getOffset(): "${field}`);
		}
	}

	override getStride(): number {
		return ShapeVertex.getStride();
	}

	override serialize(target: Float32Array, offset: number) {
		const values: number[] = [...this.pos.values(3), ...this.rgba.values(4)];
		target.set(values, offset);
	}
}
