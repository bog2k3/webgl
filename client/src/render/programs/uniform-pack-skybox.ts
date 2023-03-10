import { Matrix } from "../../joglfw/math/matrix";
import { UniformDescriptor, UniformPack, UniformType } from "../../joglfw/render/uniform-pack";

export class UPackSkybox extends UniformPack {
	constructor() {
		super();
		this.iSamplerSky = this.addUniform(<UniformDescriptor>{
			name: "textureSky",
			type: UniformType.INT,
		});
		this.iMatVPInverse = this.addUniform(<UniformDescriptor>{
			name: "matVP_inverse",
			type: UniformType.MAT4,
		});
	}

	setSkyboxSampler(val: number): void {
		this.setUniform(this.iSamplerSky, val);
	}

	setMatVPInverse(m: Matrix): void {
		this.setUniform(this.iMatVPInverse, m);
	}

	private iSamplerSky: number;
	private iMatVPInverse: number;
}
