import { Vector } from "./math/vector";
import { Mesh } from "./mesh";

export class SceneGraph {

	testMeshes: Mesh[];

	constructor() {
		this.testMeshes = [
			Mesh.makeBox(new Vector(-0.5, +0.5, 0), new Vector(0.25, 0.25, 0.25)),
			Mesh.makeBox(new Vector(+0.5, +0.5, 0), new Vector(0.25, 0.25, 0.25)),
			Mesh.makeBox(new Vector(+0.5, -0.5, 0), new Vector(0.25, 0.25, 0.25)),
			Mesh.makeBox(new Vector(-0.5, -0.5, 0), new Vector(0.25, 0.25, 0.25)),
		];
	}

	update(dt: number): void {

	}
}