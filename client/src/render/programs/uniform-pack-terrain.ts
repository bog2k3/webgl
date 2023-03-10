import { SharedUniformPacks } from "./shared-uniform-packs";
import { UniformPack, UniformType } from "../../joglfw/render/uniform-pack";

export class UPackTerrain extends UniformPack {
	constructor() {
		super();
		this.iTexSampler_[0] = this.addUniform({ name: "tex1", type: UniformType.INT, arrayLength: 1 });
		this.iTexSampler_[1] = this.addUniform({ name: "tex2", type: UniformType.INT, arrayLength: 1 });
		this.iTexSampler_[2] = this.addUniform({ name: "tex3", type: UniformType.INT, arrayLength: 1 });
		this.iTexSampler_[3] = this.addUniform({ name: "tex4", type: UniformType.INT, arrayLength: 1 });
		this.iTexSampler_[4] = this.addUniform({ name: "tex5", type: UniformType.INT, arrayLength: 1 });
	}

	setTextureSampler(index: number, val: number) {
		this.setUniform(this.iTexSampler_[index], val);
	}
	setWaterNormalTexSampler(val: number) {
		SharedUniformPacks.upWaterSurface.setWaterNormalTextureSampler(val);
	}

	private iTexSampler_: number[] = [];
}
