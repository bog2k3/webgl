import { checkGLError, gl } from "../glcontext";
import { IGLResource } from "../glresource";
import { logprefix } from "../log";
import { AABB } from "../math/aabb";
import { Matrix } from "../math/matrix";
import { Vector } from "../math/vector";
import { assert } from "../utils/assert";
import { AbstractVertex } from "./abstract-vertex";
import { RenderContext } from "./render-context";
import { Shaders } from "./shaders";
import { VertexArrayObject } from "./vao";

const console = logprefix("ShapeRenderer");

export class ShapeRenderer implements IGLResource {
	private static instance: ShapeRenderer = null;
	static get(): ShapeRenderer {
		assert(ShapeRenderer.instance != null, "ShapeRenderer has not been initialized.");
		return ShapeRenderer.instance;
	}

	static async initialize(): Promise<void> {
		console.log("Initializing...");
		ShapeRenderer.instance = new ShapeRenderer();
		await ShapeRenderer.instance.initialize();
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

	/** draws a single line segment */
	queueLine(point1: Vector, point2: Vector, rgba: Vector): void {
		point1 = point1.copy();
		point2 = point2.copy();
		this.transform([point1, point2]);
		this.pushVertex(point1.x, point1.y, point1.z, rgba.x, rgba.y, rgba.z);
		this.pushIndex(this.nVertices - 1);
		this.pushVertex(point2.x, point2.y, point2.z, rgba.x, rgba.y, rgba.z);
		this.pushIndex(this.nVertices - 1);
	}

	/** draws a list of separate lines (pairs of two vertices) */
	queueLineList(verts: Vector[], rgba: Vector): void {
		verts = verts.map((v) => v.copy());
		this.transform(verts);
		for (let i = 0; i < verts.length; i++) {
			this.pushVertex(verts[i].x, verts[i].y, verts[i].z, rgba.x, rgba.y, rgba.z);
			this.pushIndex(this.nVertices - 1);
		}
	}

	/** draws a line strip (connected lines) */
	queueLineStrip(verts: Vector[], rgba: Vector): void {
		verts = verts.map((v) => v.copy());
		this.transform(verts);
		for (let i = 0; i < verts.length; i++) {
			this.pushVertex(verts[i].x, verts[i].y, verts[i].z, rgba.x, rgba.y, rgba.z);
			this.pushIndex(this.nVertices - 1);
			if (i > 0 && i < this.nVertices - 1) {
				this.pushIndex(this.nVertices - 1);
			}
		}
	}

	/** draws a (closed) polygon - specify the vertices */
	queuePolygon(verts: Vector[], rgba: Vector): void {
		verts = verts.map((v) => v.copy());
		this.transform(verts);
		for (let i = 0; i < verts.length; i++) {
			this.pushVertex(verts[i].x, verts[i].y, verts[i].z, rgba.x, rgba.y, rgba.z);
			this.pushIndex(this.nVertices - 1);
			if (i > 0) {
				this.pushIndex(this.nVertices - 1);
			}
		}
		this.pushIndex(this.nVertices - verts.length);
	}

	queueAABB(aabb: AABB, rgba: Vector): void {
		const verts: Vector[] = [
			aabb.vMin, // bottom left back
			new Vector(aabb.vMin.x, aabb.vMax.y, aabb.vMin.z), // top left back
			new Vector(aabb.vMin.x, aabb.vMax.y, aabb.vMax.z), // top left front
			new Vector(aabb.vMin.x, aabb.vMin.y, aabb.vMax.z), // bottom left front
			new Vector(aabb.vMax.x, aabb.vMin.y, aabb.vMin.z), // bottom right back
			new Vector(aabb.vMax.x, aabb.vMax.y, aabb.vMin.z), // top right back
			aabb.vMax, // top right front
			new Vector(aabb.vMax.x, aabb.vMin.y, aabb.vMax.z), // bottom right front
		];
		this.queueLine(verts[0], verts[1], rgba);
		this.queueLine(verts[1], verts[2], rgba);
		this.queueLine(verts[2], verts[3], rgba);
		this.queueLine(verts[3], verts[0], rgba);
		this.queueLine(verts[4], verts[5], rgba);
		this.queueLine(verts[5], verts[6], rgba);
		this.queueLine(verts[6], verts[7], rgba);
		this.queueLine(verts[7], verts[4], rgba);
		this.queueLine(verts[0], verts[4], rgba);
		this.queueLine(verts[1], verts[5], rgba);
		this.queueLine(verts[2], verts[6], rgba);
		this.queueLine(verts[3], verts[7], rgba);
	}

	// sets a transform matrix that will affect all future drawXXX calls
	setTransform(mat: Matrix): void {
		this.transform_ = mat;
		this.transformActive = true;
	}

	resetTransform(): void {
		this.transformActive = false;
	}

	/** Renders all queued items and clears the queue. */
	renderAll(ctx: RenderContext): void {
		if (!this.shapeShaderProgram) {
			return;
		}

		if (!this.nIndices) {
			return;
		}

		// update render buffers:
		gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
		gl.bufferData(gl.ARRAY_BUFFER, AbstractVertex.arrayToBuffer(this.vertices), gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		gl.enable(gl.BLEND);

		gl.useProgram(this.shapeShaderProgram);
		this.VAO.bind();
		const mPV: Matrix = ctx.viewport.camera().matViewProj();
		gl.uniformMatrix4fv(this.indexMatViewProj, false, mPV.getColumnMajorValues());
		checkGLError("ShapeRenderer.setupVAOandUnif");

		gl.drawElements(gl.LINES, this.nIndices, gl.UNSIGNED_SHORT, 0);
		checkGLError("Shape3D::glDrawElements");

		gl.disable(gl.BLEND);
		this.VAO.unbind();

		// reset buffers
		this.nVertices = 0;
		this.nIndices = 0;
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
	vertices: ShapeVertex[] = [];
	indices = new Uint16Array(1000);
	nVertices = 0;
	nIndices = 0;
	transform_ = Matrix.identity();
	transformActive = false;

	private async initialize(): Promise<void> {
		this.VAO = new VertexArrayObject();
		this.VBO = gl.createBuffer();
		this.IBO = gl.createBuffer();
		await Shaders.createProgram(
			"/data/shaders/shape3d.vert",
			"/data/shaders/shape3d.frag",
			(prog: WebGLProgram) => {
				this.shapeShaderProgram = prog;
				this.indexMatViewProj = gl.getUniformLocation(this.shapeShaderProgram, "mViewProj");
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

	private pushVertex(x: number, y: number, z: number, r: number, g: number, b: number, a: number = 1): void {
		if (this.nVertices === this.vertices.length) {
			this.vertices.push(
				new ShapeVertex({
					pos: new Vector(x, y, z),
					rgba: new Vector(r, g, b, a),
				}),
			);
		} else {
			this.vertices[this.nVertices].pos.x = x;
			this.vertices[this.nVertices].pos.y = y;
			this.vertices[this.nVertices].pos.z = z;
			this.vertices[this.nVertices].rgba.x = r;
			this.vertices[this.nVertices].rgba.y = g;
			this.vertices[this.nVertices].rgba.z = b;
			this.vertices[this.nVertices].rgba.w = a;
		}
		this.nVertices++;
	}

	private pushIndex(i: number): void {
		if (this.nIndices == this.indices.length) {
			const newIndices = new Uint16Array(this.indices.length * 2);
			newIndices.set(this.indices);
			this.indices = newIndices;
		}
		this.indices[this.nIndices++] = i;
	}

	transform(verts: Vector[]): void {
		if (!this.transformActive) {
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

	constructor(data: Partial<ShapeVertex>) {
		super();
		Object.assign(this, data);
	}

	override getStride(): number {
		return ShapeVertex.getStride();
	}

	override serialize(target: Float32Array, offset: number) {
		const values: number[] = [...this.pos.values(3), ...this.rgba.values(4)];
		target.set(values, offset);
	}
}
