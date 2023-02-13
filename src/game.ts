import Ammo from "ammojs-typed";
import { FreeCamera } from "./entities/free-camera";
import { RigidObject } from "./entities/rigid-object.entity";
import { SkyBox } from "./entities/skybox";
import { StaticMesh } from "./entities/static-mesh.entity";
import { TerrainConfig } from "./entities/terrain/config";
import { Terrain } from "./entities/terrain/terrain.entity";
import { logprefix } from "./joglfw/log";
import { Vector } from "./joglfw/math/vector";
import { Mesh } from "./joglfw/mesh";
import { assert } from "./joglfw/utils/assert";
import { Event } from "./joglfw/utils/event";
import { rand } from "./joglfw/utils/random";
import { CameraController } from "./joglfw/world/camera-controller";
import { World } from "./joglfw/world/world";

const console = logprefix("Game");

export class Game {
	onStart = new Event<() => void>();
	onStop = new Event<() => void>();

	initialize(): void {
		console.log("Initializing");
		const tc = new TerrainConfig();
		tc.seed = rand();
		tc.vertexDensity = 0.1;
		tc.length = 100;
		tc.width = 100;
		tc.minElevation = -10;
		tc.maxElevation = 10;
		tc.seaFloorElevation = -10;
		tc.roughness = 0.8;
		this.terrain_ = new Terrain({ previewMode: false });
		this.terrain_.generate(tc);
		this.terrain_.finishGenerate();

		World.getInstance().addEntity(this.terrain_);

		this.freeCam_ = new FreeCamera(new Vector(10, tc.maxElevation, 10), new Vector(-1, -0.2, -1));
		World.getInstance().addEntity(this.freeCam_);

		// camera controller (this one moves the render camera to the position of the target entity)
		this.cameraCtrl_ = new CameraController(null);
		World.getInstance().addEntity(this.cameraCtrl_);
		this.cameraCtrl_.attachToEntity(this.freeCam_, new Vector(0, 0, 0));

		// player_ = std::make_shared<PlayerEntity>(glm::vec3{0.f, config_.terrainConfig.maxElevation + 10, 0.f}, 0.f);
		// World::getInstance().takeOwnershipOf(player_);

		this.skyBox_ = new SkyBox();
		World.getInstance().addEntity(this.skyBox_);

		// DEBUG---
		const m: Mesh = Mesh.makeBox(new Vector(0, 0, 0), new Vector(1, 1, 1));
		const boxShape = new Ammo.btBoxShape(new Ammo.btVector3(0.5, 0.5, 0.5));
		const boxMass = 50;
		const box = new RigidObject(m, new Vector(0, tc.maxElevation + 5, 0), boxShape, boxMass);
		World.getInstance().addEntity(box);
		//---DEBUG

		console.log("Ready");
	}

	start(): void {
		console.log("Starting game...");
		assert(!this.started_, "Game already started");
		this.started_ = true;
		this.onStart.trigger();
		console.log("Game started.");
	}

	stop(): void {
		console.log("Stopping game...");
		assert(this.started_, "Game is not started");
		this.started_ = false;
		this.onStop.trigger();
		console.log("Game stopped.");
	}

	terrain(): Terrain {
		return this.terrain_;
	}

	skyBox(): SkyBox {
		return this.skyBox_;
	}

	// player(): Player {
	// 	return this.player_;
	// }

	freeCam(): FreeCamera {
		return this.freeCam_;
	}

	cameraCtrl(): CameraController {
		return this.cameraCtrl_;
	}

	// -------------------- PRIVATE AREA ----------------------------- //
	private started_ = false;
	terrain_: Terrain;
	skyBox_: SkyBox;
	// player_: Player;
	freeCam_: FreeCamera;
	cameraCtrl_: CameraController;
}
