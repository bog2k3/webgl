import { UPackWater } from './uniform-pack-water';
import { ShaderProgram } from '../../joglr/shader-program';

export class ShaderWater extends ShaderProgram {
	constructor() {
		super();
	}

	load(): void {
		if (this.isValid()) {
			return; // already loaded
		}

		if (!super.load("data/shaders/water.vert", "data/shaders/water.frag")) {
			console.error("Failed to load water shader!");
		}
	}

	uniforms(): UPackWater {
		return this.upackWater_;
	}

	private upackWater_ = new UPackWater();
};