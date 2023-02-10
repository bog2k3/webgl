import { SharedUniformPacks } from './shared-uniform-packs';
import { UniformPack, UniformType } from './../../joglr/uniform-pack';

export class UPackTerrain extends UniformPack {
	constructor() {
		super();
		this.iTexSampler_ = this.addUniform({name: "tex", type: UniformType.INT, arrayLength: 5});
	}

	setTextureSampler(index: number, val: number) {
		this.setUniformIndexed(this.iTexSampler_, index, val);
	}
	setWaterNormalTexSampler(val: number) {
		SharedUniformPacks.upWaterSurface.setWaterNormalTextureSampler(val);
	}

	private iTexSampler_: number;
};