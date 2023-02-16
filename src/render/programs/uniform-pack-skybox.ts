import { UniformDescriptor, UniformPack, UniformType } from "../../joglfw/render/uniform-pack";

export class UPackSkybox extends UniformPack {
	constructor() {
		super();
		this.iSamplerSky = this.addUniform(<UniformDescriptor>{
			name: "textureSky",
			type: UniformType.INT,
		});
	}

	private iSamplerSky = 0;
}
