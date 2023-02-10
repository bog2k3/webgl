import { UPackTerrain } from './uniform-pack-terrain';
import { ShaderProgram } from '../../joglr/shader-program';

export class ShaderTerrain extends ShaderProgram {

	// TODO this is not necessary to override
	override async load(vertPath: string, fragPath: string): Promise<boolean> {
		if (this.isValid())
			return; // already loaded

		if (!super.load("data/shaders/terrain.vert", "data/shaders/terrain.frag")) {
			throw new Error("Failed to load terrain shaders!");
		}
	}

	uniforms(): UPackTerrain {
		return this.upackTerrain_;
	}

	private upackTerrain_ = new UPackTerrain();
}