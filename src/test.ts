import { Matrix } from "./joglr/math/matrix";
import { Vector } from "./joglr/math/vector";
import { Mesh } from "./joglr/mesh";
import { rand } from './joglr/utils/random';
import { TerrainConfig } from './world/entities/config';
import { StaticMesh } from "./world/entities/static-mesh.entity";
import { Terrain } from './world/entities/terrain/terrain.entity';
import { World } from './world/world';


export function DEBUG_ENTRY() {
	const tc = new TerrainConfig();
	tc.seed = rand();
	tc.vertexDensity = 0.5;
	const terrain = new Terrain(true);
	terrain.generate(tc);
	terrain.finishGenerate();

	const m = Mesh.makeBox(new Vector(), new Vector(0.4, 0.4, 0.4));
	World.getInstance().addEntity(new StaticMesh(m, Matrix.translate(new Vector(-0.5, +0.5))));
	World.getInstance().addEntity(new StaticMesh(m, Matrix.translate(new Vector(+0.5, +0.5))));
	World.getInstance().addEntity(new StaticMesh(m, Matrix.translate(new Vector(+0.5, -0.5))));
	World.getInstance().addEntity(new StaticMesh(m, Matrix.translate(new Vector(-0.5, -0.5))));

	World.getInstance().addEntity(new StaticMesh(m, Matrix.translate(new Vector(0, -1, 0)).mul(Matrix.scale(10, 0.1, 10))));

	World.getInstance().addEntity(terrain);
}
