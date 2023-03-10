import { UniformPack, UniformType } from "../../joglfw/render/uniform-pack";

// provides a uniform pack for "water-surface" uniforms from water-surface.glsl
export class UPackWaterSurface extends UniformPack {
	constructor() {
		super();
		this.iTexWaterNormalSampler_ = this.addUniform({
			name: "textureWaterNormal",
			type: UniformType.INT,
			arrayLength: 1,
		});
	}

	setWaterNormalTextureSampler(val: number) {
		this.setUniform(this.iTexWaterNormalSampler_, val);
	}

	private iTexWaterNormalSampler_: number;
}
