import { VertexArrayObject } from "./render/vao";
import { AbstractVertex } from "./render/abstract-vertex";
import { gl } from "./glcontext";
import { IGLResource } from "./glresource";
import { Vector } from "./math/vector";

export enum MeshRenderModes {
	Points = "points",
	Lines = "lines",
	Triangles = "triangles",
}

export class MeshVertex extends AbstractVertex {
	position = new Vector(); // 3
	normal = new Vector(); // 3
	UV1 = new Vector(); // 2
	color = new Vector(1, 0, 1); // 4

	// returns the size in bytes
	static getStride(): number {
		return 4 * (3 + 3 + 2 + 4);
	}

	static getOffset(field: keyof MeshVertex): number {
		switch (field) {
			case "position":
				return 4 * 0;
			case "normal":
				return 4 * 3;
			case "UV1":
				return 4 * 6;
			case "color":
				return 4 * 8;
			default:
				throw new Error(`Invalid field specified in MeshVertex.getOffset(): "${field}`);
		}
	}

	constructor(data: Partial<MeshVertex>) {
		super();
		Object.assign(this, data);
	}

	override getStride(): number {
		return MeshVertex.getStride();
	}

	override serialize(target: Float32Array, offset: number) {
		const values: number[] = [
			...this.position.values(3),
			...this.normal.values(3),
			...this.UV1.values(2),
			...this.color.values(4),
		];
		target.set(values, offset);
	}
}

export class Mesh implements IGLResource {
	static RenderModes = MeshRenderModes;
	static ENABLE_COLOR_DEBUG = false;

	// the following are used only by Mesh renderers
	vertexAttribsProgramBinding_: WebGLProgram = null;
	VAO: VertexArrayObject;
	VBO: WebGLBuffer;
	IBO: WebGLBuffer;
	indexCount = 0;
	mode: MeshRenderModes = MeshRenderModes.Triangles;

	constructor() {
		this.VAO = new VertexArrayObject();
		this.VBO = gl.createBuffer();
		this.IBO = gl.createBuffer();
	}

	release(): void {
		gl.deleteBuffer(this.VBO);
		gl.deleteBuffer(this.IBO);
		this.VBO = this.IBO = null;
		this.indexCount = 0;
		this.VAO.release();
		this.VAO = null;
	}

	getRenderMode(): MeshRenderModes {
		return this.mode;
	}

	getElementsCount(): number {
		return this.indexCount;
	}

	static makeScreenQuad(): Mesh {
		const vertices: MeshVertex[] = [
			new MeshVertex({
				// #0 top-left
				position: new Vector(-1, +1, 0),
			}),
			new MeshVertex({
				// #1 top-right
				position: new Vector(+1, +1, 0),
			}),
			new MeshVertex({
				// #2 bottom-left
				position: new Vector(-1, -1, 0),
			}),
			new MeshVertex({
				// #3 bottom right
				position: new Vector(+1, -1, 0),
			}),
		];
		const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);
		return Mesh.makeMesh(vertices, indices);
	}

	static makeBox(center: Vector, size: Vector): Mesh {
		const left: number = center.x - size.x * 0.5;
		const right: number = center.x + size.x * 0.5;
		const bottom: number = center.y - size.y * 0.5;
		const top: number = center.y + size.y * 0.5;
		const back: number = center.z - size.z * 0.5;
		const front: number = center.z + size.z * 0.5;
		const nBack = Vector.axisZ(-1);
		const nFront = Vector.axisZ();
		const nLeft = Vector.axisX(-1);
		const nRight = Vector.axisX();
		const nTop = Vector.axisY();
		const nBottom = Vector.axisY(-1);
		const white = new Vector(1, 1, 1, 1);
		const vertices: MeshVertex[] = [
			// back face
			// #0 back bottom left
			new MeshVertex({
				position: new Vector(left, bottom, back),
				normal: nBack,
				UV1: new Vector(0, 0),
				color: white,
			}),
			// #1 back top left
			new MeshVertex({
				position: new Vector(left, top, back),
				normal: nBack,
				UV1: new Vector(0, 1),
				color: white,
			}),
			// #2 back top right
			new MeshVertex({
				position: new Vector(right, top, back),
				normal: nBack,
				UV1: new Vector(1, 1),
				color: white,
			}),
			// #3 back bottom right
			new MeshVertex({
				position: new Vector(right, bottom, back),
				normal: nBack,
				UV1: new Vector(1, 0),
				color: white,
			}),
			// top face
			// #4 back top left
			new MeshVertex({
				position: new Vector(left, top, back),
				normal: nTop,
				UV1: new Vector(0, 0),
				color: white,
			}),
			// #5 front top left
			new MeshVertex({
				position: new Vector(left, top, front),
				normal: nTop,
				UV1: new Vector(0, 1),
				color: white,
			}),
			// #6 front top right
			new MeshVertex({
				position: new Vector(right, top, front),
				normal: nTop,
				UV1: new Vector(1, 1),
				color: white,
			}),
			// #7 back top right
			new MeshVertex({
				position: new Vector(right, top, back),
				normal: nTop,
				UV1: new Vector(1, 0),
				color: white,
			}),
			// front face
			// #8 front top right
			new MeshVertex({
				position: new Vector(right, top, front),
				normal: nFront,
				UV1: new Vector(0, 0),
				color: white,
			}),
			// #9 front top left
			new MeshVertex({
				position: new Vector(left, top, front),
				normal: nFront,
				UV1: new Vector(0, 1),
				color: white,
			}),
			// #10 front bottom left
			new MeshVertex({
				position: new Vector(left, bottom, front),
				normal: nFront,
				UV1: new Vector(1, 1),
				color: white,
			}),
			// #11 front bottom right
			new MeshVertex({
				position: new Vector(right, bottom, front),
				normal: nFront,
				UV1: new Vector(1, 0),
				color: white,
			}),
			// bottom face
			// #12 front bottom left
			new MeshVertex({
				position: new Vector(left, bottom, front),
				normal: nBottom,
				UV1: new Vector(0, 0),
				color: white,
			}),
			// #13 back bottom left
			new MeshVertex({
				position: new Vector(left, bottom, back),
				normal: nBottom,
				UV1: new Vector(0, 1),
				color: white,
			}),
			// #14 back bottom right
			new MeshVertex({
				position: new Vector(right, bottom, back),
				normal: nBottom,
				UV1: new Vector(1, 1),
				color: white,
			}),
			// #15 front bottom right
			new MeshVertex({
				position: new Vector(right, bottom, front),
				normal: nBottom,
				UV1: new Vector(1, 0),
				color: white,
			}),
			// left face
			// #16 front bottom left
			new MeshVertex({
				position: new Vector(left, bottom, front),
				normal: nLeft,
				UV1: new Vector(0, 0),
				color: white,
			}),
			// #17 front top left
			new MeshVertex({
				position: new Vector(left, top, front),
				normal: nLeft,
				UV1: new Vector(0, 1),
				color: white,
			}),
			// #18 back top left
			new MeshVertex({
				position: new Vector(left, top, back),
				normal: nLeft,
				UV1: new Vector(1, 1),
				color: white,
			}),
			// #19 back bottom left
			new MeshVertex({
				position: new Vector(left, bottom, back),
				normal: nLeft,
				UV1: new Vector(1, 0),
				color: white,
			}),
			// right face
			// #20 back bottom right
			new MeshVertex({
				position: new Vector(right, bottom, front),
				normal: nRight,
				UV1: new Vector(0, 0),
				color: white,
			}),
			// #21 back top right
			new MeshVertex({
				position: new Vector(right, top, front),
				normal: nRight,
				UV1: new Vector(0, 1),
				color: white,
			}),
			// #22 front top right
			new MeshVertex({
				position: new Vector(right, top, back),
				normal: nRight,
				UV1: new Vector(1, 1),
				color: white,
			}),
			// #23 front bottom right
			new MeshVertex({
				position: new Vector(right, bottom, back),
				normal: nRight,
				UV1: new Vector(1, 0),
				color: white,
			}),
		];

		if (Mesh.ENABLE_COLOR_DEBUG) {
			// enable debugging vertices with colors
			const c: Vector[] = [
				new Vector(1, 0, 0, 1),
				new Vector(0, 1, 0, 1),
				new Vector(0, 0, 1, 1),
				new Vector(1, 1, 0, 1),
			];
			for (let i = 0; i < vertices.length; i++) {
				vertices[i].color = c[i % c.length];
			}
		}

		const indices = new Uint16Array([
			// back face
			0, 1, 2, 0, 2, 3,
			// top face
			4, 5, 6, 4, 6, 7,
			// front face
			8, 9, 10, 8, 10, 11,
			// bottom face
			12, 13, 14, 12, 14, 15,
			// left face
			16, 17, 18, 16, 18, 19,
			// right face
			20, 22, 21, 20, 23, 22,
		]);

		return Mesh.makeMesh(vertices, indices);
	}

	static makeGizmo(): Mesh {
		const red = new Vector(1, 0, 0, 1);
		const green = new Vector(0, 1, 0, 1);
		const blue = new Vector(0, 0, 1, 1);
		const verts: MeshVertex[] = [
			new MeshVertex({ position: new Vector(0, 0, 0), color: red }),
			new MeshVertex({ position: new Vector(1, 0, 0), color: red }),
			new MeshVertex({ position: new Vector(0, 0, 0), color: green }),
			new MeshVertex({ position: new Vector(0, 1, 0), color: green }),
			new MeshVertex({ position: new Vector(0, 0, 0), color: blue }),
			new MeshVertex({ position: new Vector(0, 0, 1), color: blue }),
		];
		const indexes = new Uint16Array([0, 1, 2, 3, 4, 5]);
		const m = Mesh.makeMesh(verts, indexes);
		m.mode = MeshRenderModes.Lines;
		return m;
	}

	static makeSphere(): Mesh {
		throw new Error("not implemented");
	}

	// ----------------------- PRIVATE AREA ---------------------- //

	private static makeMesh(vertices: MeshVertex[], indices: Uint16Array): Mesh {
		const m = new Mesh();

		gl.bindBuffer(gl.ARRAY_BUFFER, m.VBO);
		gl.bufferData(gl.ARRAY_BUFFER, AbstractVertex.arrayToBuffer(vertices), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		m.indexCount = indices.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.IBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		m.mode = MeshRenderModes.Triangles;
		return m;
	}
}
