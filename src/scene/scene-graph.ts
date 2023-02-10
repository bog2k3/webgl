import { Camera } from "../joglr/camera";
import { quatRotation } from "../joglr/math/quat-functions";
import { Vector } from "../joglr/math/vector";
import { IRenderable } from "./renderable";

export class SceneGraph {
	constructor(public camera: Camera) {
	}

	update(dt: number): void {
		if (0) {
			const ROT_SPEED = Math.PI / 4; // rad per second
			this.camera.orbit(new Vector(0,0,0), quatRotation(new Vector(0, 1, 0), ROT_SPEED * dt), true);
		}
	}

	addObject(obj: IRenderable): void {
		this.objects.push(obj);
	}

	getObjects(): IRenderable[] {
		return this.objects;
	}

	// --------------------- PRIVATE AREA --------------------- //

	objects: IRenderable[] = [];
}
