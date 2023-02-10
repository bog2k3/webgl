import { Matrix } from "./joglr/math/matrix";
import { Vector } from "./joglr/math/vector";
import { Mesh } from "./joglr/mesh";
import { rand, randSeed } from "./joglr/utils/random";
import { TerrainConfig } from "./world/entities/terrain/config";
import { StaticMesh } from "./world/entities/static-mesh.entity";
import { Terrain } from "./world/entities/terrain/terrain.entity";
import { World } from "./world/world";

export function DEBUG_ENTRY() {
	const tc = new TerrainConfig();
	tc.seed = rand();
	tc.vertexDensity = 5;
	tc.length = 20;
	tc.width = 20;
	tc.minElevation = -2;
	tc.maxElevation = 4;
	const terrain = new Terrain(true);
	terrain.generate(tc);
	terrain.finishGenerate();

	const m = Mesh.makeBox(new Vector(), new Vector(0.4, 0.4, 0.4));
	World.getInstance().addEntity(new StaticMesh(m, Matrix.translate(new Vector(-0.5, +0.5))));
	World.getInstance().addEntity(new StaticMesh(m, Matrix.translate(new Vector(+0.5, +0.5))));
	World.getInstance().addEntity(new StaticMesh(m, Matrix.translate(new Vector(+0.5, -0.5))));
	World.getInstance().addEntity(new StaticMesh(m, Matrix.translate(new Vector(-0.5, -0.5))));

	World.getInstance().addEntity(terrain);
}

export function testRand() {
	for (let step = 0; step < 10; step++) {
		const seed = new Date().getMilliseconds() * new Date().getMilliseconds();
		randSeed(seed);
		console.log("Seed ", seed);
		for (let i = 0; i < 10; i++) console.log("    ", rand());
	}
}
