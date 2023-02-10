import { UPackWaterSurface } from './uniform-pack-water-surface';
import { UPackCommon } from './uniform-pack-common';

export class SharedUniformPacks {
	static upCommon: UPackCommon;
	static upWaterSurface: UPackWaterSurface;

	static initialize(): void {
		SharedUniformPacks.upCommon = new UPackCommon();
		SharedUniformPacks.upWaterSurface = new UPackWaterSurface();
	}
};