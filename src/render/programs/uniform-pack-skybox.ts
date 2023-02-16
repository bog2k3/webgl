import { UniformDescriptor, UniformPack, UniformType } from "../../joglfw/render/uniform-pack";

export class UPackSkybox extends UniformPack {
	constructor() {
		super();
		this.iSamplerSky = this.addUniform(<UniformDescriptor>{
			name: "textureSky",
			type: UniformType.INT,
		});
	}

	setSkyboxSampler(val: number): void {
		this.setUniform(this.iSamplerSky, val);
	}

	private iSamplerSky = 0;
}
