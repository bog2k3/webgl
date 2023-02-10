import { FreeCamera } from "./entities/free-camera";
import { SkyBox } from "./entities/skybox";
import { TerrainConfig } from "./entities/terrain/config";
import { Terrain } from "./entities/terrain/terrain.entity";
import { Vector } from "./joglr/math/vector";
import { assert } from "./joglr/utils/assert";
import { Event } from "./joglr/utils/event";
import { rand } from "./joglr/utils/random";
import { CameraController } from "./joglr/world/camera-controller";
import { World } from "./joglr/world/world";
import { logprefix } from "./joglr/log";

const console = logprefix("Game");

export class Game {
	onStart = new Event<() => void>();
	onStop = new Event<() => void>();

	initialize(): void {
		console.log("Initializing");
		const tc = new TerrainConfig();
		tc.seed = rand();
		tc.vertexDensity = 0.5;
		tc.length = 200;
		tc.width = 200;
		tc.minElevation = -2;
		tc.maxElevation = 4;
		this.terrain_ = new Terrain(true);
		this.terrain_.generate(tc);
		this.terrain_.finishGenerate();

		World.getInstance().addEntity(this.terrain_);

		// this.freeCam_ = new FreeCamera(new Vector(140, 50, 180), new Vector(-1, -0.5, -1));
		this.freeCam_ = new FreeCamera(new Vector(0, 50, 0), new Vector(0, -0.9, 0.1));
		World.getInstance().addEntity(this.freeCam_);

		// camera controller (this one moves the render camera to the position of the target entity)
		this.cameraCtrl_ = new CameraController(null);
		World.getInstance().addEntity(this.cameraCtrl_);
		this.cameraCtrl_.attachToEntity(this.freeCam_, new Vector(0, 0, 0));

		// player_ = std::make_shared<PlayerEntity>(glm::vec3{0.f, config_.terrainConfig.maxElevation + 10, 0.f}, 0.f);
		// World::getInstance().takeOwnershipOf(player_);

		this.skyBox_ = new SkyBox();
		World.getInstance().addEntity(this.skyBox_);

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
