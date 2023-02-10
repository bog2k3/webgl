import { gl } from './../../joglr/glcontext';
import { SharedUniformPacks } from './shared-uniform-packs';
import { UPackTerrain } from './uniform-pack-terrain';
import { ShaderProgram } from '../../joglr/shader-program';

export class ShaderTerrain extends ShaderProgram {
	constructor() {
		super();
		this.useUniformPack(SharedUniformPacks.upCommon);
		this.useUniformPack(SharedUniformPacks.upWaterSurface);
		this.useUniformPack(this.upackTerrain_);

		this.defineVertexAttrib("pos", gl.FLOAT, 3);
		this.defineVertexAttrib("normal", gl.FLOAT, 3);
		this.defineVertexAttrib("color", gl.FLOAT, 4);
		this.defineVertexAttrib("uv1", gl.FLOAT, 2);
		this.defineVertexAttrib("uv2", gl.FLOAT, 2);
		this.defineVertexAttrib("uv3", gl.FLOAT, 2);
		this.defineVertexAttrib("uv4", gl.FLOAT, 2);
		this.defineVertexAttrib("uv5", gl.FLOAT, 2);
		this.defineVertexAttrib("texBlendFactor", gl.FLOAT, 4);
	}

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

	protected upackTerrain_ = new UPackTerrain();
}