import { AbstractVertex } from "./abstract-vertex";
import { gl } from "./glcontext";
import { IGLResource } from "./glresource";
import { Vector } from "./math/vector";

export enum MeshRenderModes {
	Points = "points",
	Lines = "lines",
	Triangles = "triangles"
};

export class MeshVertex extends AbstractVertex {
	position: Vector; // 3
	normal: Vector; // 3
	UV1: Vector; // 2
	color: Vector; // 4

	static getSize(): number {
		return 4 * (3 + 3 + 2 + 4);
	}

	static getOffset(field: keyof MeshVertex): number {
		switch (field) {
			case "position": return 0;
			case "normal": return 3 * 4;
			case "UV1": return 6 * 4;
			case "color": return 8 * 4;
			default: throw new Error(`Invalid field specified in MeshVertex.getOffset(): "${field}`);
		}
	}

	constructor(data: Partial<MeshVertex>) {
		super();
		Object.assign(this, data);
	}

	override getSize(): number {
		return MeshVertex.getSize();
	}

	override serialize(target: Float32Array, offset: number) {
		const values: number[] = [
			...this.position.values(3),
			...this.normal.values(3),
			...this.UV1.values(2),
			...this.color.values(4)
		];
		target.set(values, offset);
	}
};

export class Mesh implements IGLResource {
	static RenderModes = MeshRenderModes;

	constructor() {
		this.VBO_ = gl.createBuffer();
		this.IBO_ = gl.createBuffer();
	}

	release(): void {
		gl.deleteBuffer(this.VBO_);
		gl.deleteBuffer(this.IBO_);
		this.VBO_ = this.IBO_ = null;
	}

	static makeBox(center: Vector, size: Vector): Mesh {
		const left: number = center.x - size.x * 0.5;
		const right: number = center.x + size.x * 0.5;
		const bottom: number = center.y - size.y * 0.5;
		const top: number = center.y + size.y * 0.5;
		const back: number = center.z - size.z * 0.5;
		const front: number = center.z + size.z * 0.5;
		const nBack = new Vector(0, 0, -1);
		const nFront = new Vector(0, 0, 1);
		const nLeft = new Vector(-1, 0, 0);
		const nRight = new Vector(1, 0, 0);
		const nTop = new Vector(0, 1, 0);
		const nBottom = new Vector(0, -1, 0);
		const white = new Vector(1, 1, 1, 1);
		const vertices: MeshVertex[] = [
		// back face
			// #0 back bottom left
			new MeshVertex({
				position: new Vector(left, bottom, back),
				normal: nBack,
				UV1: new Vector(0, 0),
				color: white
			}),
			// #1 back top left
			new MeshVertex({
				position: new Vector(left, top, back),
				normal: nBack,
				UV1: new Vector(0, 1),
				color: white
			}),
			// #2 back top right
			new MeshVertex({
				position: new Vector(right, top, back),
				normal: nBack,
				UV1: new Vector(1, 1),
				color: white
			}),
			// #3 back bottom right
			new MeshVertex({
				position: new Vector(right, bottom, back),
				normal: nBack,
				UV1: new Vector(1, 0),
				color: white
			}),
		// top face
			// #4 back top left
			new MeshVertex({
				position: new Vector(left, top, back),
				normal: nTop,
				UV1: new Vector(0, 0),
				color: white
			}),
			// #5 front top left
			new MeshVertex({
				position: new Vector(left, top, front),
				normal: nTop,
				UV1: new Vector(0, 1),
				color: white
			}),
			// #6 front top right
			new MeshVertex({
				position: new Vector(right, top, front),
				normal: nTop,
				UV1: new Vector(1, 1),
				color: white
			}),
			// #7 back top right
			new MeshVertex({
				position: new Vector(right, top, back),
				normal: nTop,
				UV1: new Vector(1, 0),
				color: white
			}),
		// front face
			// #8 front top right
			new MeshVertex({
				position: new Vector(right, top, front),
				normal: nFront,
				UV1: new Vector(0, 0),
				color: white
			}),
			// #9 front top left
			new MeshVertex({
				position: new Vector(left, top, front),
				normal: nFront,
				UV1: new Vector(0, 1),
				color: white
			}),
			// #10 front bottom left
			new MeshVertex({
				position: new Vector(left, bottom, front),
				normal: nFront,
				UV1: new Vector(1, 1),
				color: white
			}),
			// #11 front bottom right
			new MeshVertex({
				position: new Vector(right, bottom, front),
				normal: nFront,
				UV1: new Vector(1, 0),
				color: white
			}),
		// bottom face
			// #12 front bottom left
			new MeshVertex({
				position: new Vector(left, bottom, front),
				normal: nBottom,
				UV1: new Vector(0, 0),
				color: white
			}),
			// #13 back bottom left
			new MeshVertex({
				position: new Vector(left, bottom, back),
				normal: nBottom,
				UV1: new Vector(0, 1),
				color: white
			}),
			// #14 back bottom right
			new MeshVertex({
				position: new Vector(right, bottom, back),
				normal: nBottom,
				UV1: new Vector(1, 1),
				color: white
			}),
			// #15 front bottom right
			new MeshVertex({
				position: new Vector(right, bottom, front),
				normal: nBottom,
				UV1: new Vector(1, 0),
				color: white
			}),
		// left face
			// #16 front bottom left
			new MeshVertex({
				position: new Vector(left, bottom, front),
				normal: nLeft,
				UV1: new Vector(0, 0),
				color: white
			}),
			// #17 front top left
			new MeshVertex({
				position: new Vector(left, top, front),
				normal: nLeft,
				UV1: new Vector(0, 1),
				color: white
			}),
			// #18 back top left
			new MeshVertex({
				position: new Vector(left, top, back),
				normal: nLeft,
				UV1: new Vector(1, 1),
				color: white
			}),
			// #19 back bottom left
			new MeshVertex({
				position: new Vector(left, bottom, back),
				normal: nLeft,
				UV1: new Vector(1, 0),
				color: white
			}),
		// right face
			// #20 back bottom right
			new MeshVertex({
				position: new Vector(right, bottom, front),
				normal: nRight,
				UV1: new Vector(0, 0),
				color: white
			}),
			// #21 back top right
			new MeshVertex({
				position: new Vector(right, top, front),
				normal: nRight,
				UV1: new Vector(0, 1),
				color: white
			}),
			// #22 front top right
			new MeshVertex({
				position: new Vector(right, top, back),
				normal: nRight,
				UV1: new Vector(1, 1),
				color: white
			}),
			// #23 front bottom right
			new MeshVertex({
				position: new Vector(right, bottom, back),
				normal: nRight,
				UV1: new Vector(1, 0),
				color: white
			})
		];

		if (true) { // debug vertices with colors
			const c: Vector[] = [ new Vector(1, 0, 0, 1), new Vector(0, 1, 0, 1), new Vector(0, 0, 1, 1), new Vector(1, 1, 0, 1) ];
			for (let i=0; i<vertices.length; i++) {
				vertices[i].color = c[i % c.length];
			}
		}

		const m = new Mesh();

		gl.bindBuffer(gl.ARRAY_BUFFER, m.VBO_);
		gl.bufferData(gl.ARRAY_BUFFER, AbstractVertex.arrayToBuffer(vertices), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

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
			20, 21, 22, 20, 22, 23
		]);
		m.indexCount_ = indices.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.IBO_);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		m.mode_ = MeshRenderModes.Triangles;
		return m;
	}

	static makeGizmo(): Mesh {
		throw new Error("not implemented");
	}

	static makeSphere(): Mesh {
		throw new Error("not implemented");
	}

	// ----------------------- PRIVATE AREA ---------------------- //
	VBO_: WebGLBuffer;
	IBO_: WebGLBuffer;
	indexCount_ = 0;
	mode_: MeshRenderModes = MeshRenderModes.Triangles;
}