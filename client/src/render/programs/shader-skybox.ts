import { gl } from "../../joglfw/glcontext";
import { ShaderProgram } from "../../joglfw/render/shader-program";
import { SharedUniformPacks } from "./shared-uniform-packs";
import { UPackSkybox } from "./uniform-pack-skybox";

export class ShaderSkybox extends ShaderProgram {
	constructor() {
		super();
		this.useUniformPack(SharedUniformPacks.upCommon);
		this.useUniformPack(this.upackSkybox);
		this.defineVertexAttrib("pos", gl.FLOAT, 3);
	}

	override load(): Promise<boolean> {
		if (this.isValid()) {
			return; // already loaded
		}
		return super.load("data/shaders/skybox.vert", "data/shaders/skybox.frag");
	}

	uniforms(): UPackSkybox {
		return this.upackSkybox;
	}

	private upackSkybox = new UPackSkybox();
}
