import { Camera } from "./camera";
import { quatRotation } from "./math/quat-functions";
import { Vector } from "./math/vector";
import { Mesh } from "./mesh";

export class SceneGraph {

	testMeshes: Mesh[];

	constructor(public camera: Camera) {
		this.testMeshes = [
			Mesh.makeBox(new Vector(-0.5, +0.5, 0), new Vector(0.25, 0.25, 0.25)),
			Mesh.makeBox(new Vector(+0.5, +0.5, 0), new Vector(0.25, 0.25, 0.25)),
			Mesh.makeBox(new Vector(+0.5, -0.5, 0), new Vector(0.25, 0.25, 0.25)),
			Mesh.makeBox(new Vector(-0.5, -0.5, 0), new Vector(0.25, 0.25, 0.25)),
		];
	}

	update(dt: number): void {
		const ROT_SPEED = Math.PI / 4; // rad per second
		this.camera.orbit(new Vector(0,0,0), quatRotation(new Vector(0, 1, 0), ROT_SPEED * dt), true);
	}
}