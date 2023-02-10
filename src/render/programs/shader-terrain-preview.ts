import { ShaderProgram } from './../../joglr/shader-program';
import { ShaderTerrain } from './shader-terrain';

export class ShaderTerrainPreview extends ShaderTerrain {

	async load(): Promise<boolean> {
		if (this.isValid())
			return; // already loaded

		if (!await ShaderProgram.prototype.load.call(this, "data/shaders/terrain-preview.vert", "data/shaders/terrain-preview.frag")) {
			throw new Error("Failed to load terrain shaders!");
		}
		return true;
	}
}
