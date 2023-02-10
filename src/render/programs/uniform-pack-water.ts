import { SharedUniformPacks } from './shared-uniform-packs';
import { UniformPack, UniformType } from './../../joglr/uniform-pack';

export class UPackWater extends UniformPack {
	constructor() {
		super();
		this.iTexFoam_ = this.addUniform({name: "textureFoam", type: UniformType.INT, arrayLength: 1});
		this.iTexReflection_2D_ = this.addUniform({name: "textureReflection", type: UniformType.INT, arrayLength: 1});
		this.iTexRefraction_ = this.addUniform({name: "textureRefraction", type: UniformType.INT, arrayLength: 1});
		this.iTexRefraction_Cube_ = this.addUniform({name: "textureRefractionCube", type: UniformType.INT, arrayLength: 1});
	}

	setFoamTexSampler(val: number): void			{ this.setUniform(this.iTexFoam_, val); }
	setReflectionTexSampler(val: number): void		{ this.setUniform(this.iTexReflection_2D_, val); }
	setRefractionTexSampler(val: number): void		{ this.setUniform(this.iTexRefraction_, val); }
	setRefractionCubeTexSampler(val: number): void	{ this.setUniform(this.iTexRefraction_Cube_, val); }
	setWaterNormalTexSampler(val: number): void		{ SharedUniformPacks.upWaterSurface.setWaterNormalTextureSampler(val); }

	private iTexFoam_: number;
	private iTexReflection_2D_: number;
	private iTexRefraction_Cube_: number;
	private iTexRefraction_: number;
};
