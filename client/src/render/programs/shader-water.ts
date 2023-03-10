import { gl } from "../../joglfw/glcontext";
import { ShaderProgram } from "../../joglfw/render/shader-program";
import { SharedUniformPacks } from "./shared-uniform-packs";
import { UPackWater } from "./uniform-pack-water";

export class ShaderWater extends ShaderProgram {
	constructor() {
		super();
		this.useUniformPack(SharedUniformPacks.upCommon);
		this.useUniformPack(SharedUniformPacks.upWaterSurface);
		this.useUniformPack(this.upackWater);

		this.defineVertexAttrib("pos", gl.FLOAT, 3);
		this.defineVertexAttrib("fog", gl.FLOAT, 1);
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
		return this.upackWater;
	}

	private upackWater = new UPackWater();
}
