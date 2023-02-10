import { UPackTerrain } from './uniform-pack-terrain';
import { ShaderProgram } from '../../joglr/shader-program';

export class ShaderTerrain extends ShaderProgram {

	async load(): Promise<boolean> {
		if (this.isValid())
			return; // already loaded

		if (!await super.load("data/shaders/terrain.vert", "data/shaders/terrain.frag")) {
			throw new Error("Failed to load terrain shaders!");
		}
		return true;
	}

	uniforms(): UPackTerrain {
		return this.upackTerrain_;
	}

	private upackTerrain_ = new UPackTerrain();
}