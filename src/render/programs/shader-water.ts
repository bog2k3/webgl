import { ShaderProgram } from "../../joglr/render/shader-program";
import { UPackWater } from "./uniform-pack-water";

export class ShaderWater extends ShaderProgram {
	constructor() {
		super();
	}

	async load(): Promise<boolean> {
		if (this.isValid()) {
			return; // already loaded
		}

		if (!(await super.load("data/shaders/water.vert", "data/shaders/water.frag"))) {
			throw new Error("Failed to load water shader!");
		}
		return true;
	}

	uniforms(): UPackWater {
		return this.upackWater_;
	}

	private upackWater_ = new UPackWater();
}
