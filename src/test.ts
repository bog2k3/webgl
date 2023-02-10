import { Viewport } from './joglr/viewport';
import { World } from './world/world';
import { Terrain } from './world/entities/terrain/terrain.entity';
import { rand } from './joglr/utils/random';
import { TerrainConfig } from './world/entities/config';


export function DEBUG_ENTRY(world: World, viewport: Viewport) {
	const tc = new TerrainConfig();
	tc.seed = rand();
	tc.vertexDensity = 0.5;
	const terrain = new Terrain(true);
	terrain.generate(tc);
	terrain.finishGenerate();

	world.addEntity(terrain);
}
