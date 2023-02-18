import Ammo from "ammojs-typed";
import { Car } from "./entities/car.entity";
import { FreeCamera } from "./entities/free-camera";
import { RigidObject } from "./entities/rigid-object.entity";
import { SkyBox } from "./entities/skybox";
import { TerrainConfig } from "./entities/terrain/config";
import { Terrain } from "./entities/terrain/terrain.entity";
import { logprefix } from "./joglfw/log";
import { Quat } from "./joglfw/math/quat";
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

	async initialize(): Promise<void> {
		console.log("Initializing");
		const tc = new TerrainConfig();
		tc.seed = rand();
		tc.vertexDensity = 0.5;
		tc.length = 100;
		tc.width = 100;
		tc.minElevation = -2;
		tc.maxElevation = 2;
		tc.seaFloorElevation = -10;
		tc.roughness = 0.8;
		this.terrain_ = new Terrain({ previewMode: false });
		this.terrain_.generate(tc);
		this.terrain_.finishGenerate();

		World.getInstance().addEntity(this.terrain_);

		this.freeCam_ = new FreeCamera(
			// new Vector(tc.width / 1.8, tc.maxElevation + 20, tc.length / 1.8),
			new Vector(tc.width / 3.8, tc.maxElevation + 10, tc.length / 3.8),
			new Vector(-1, -0.45, -1),
		);
		World.getInstance().addEntity(this.freeCam_);

		// camera controller (this one moves the render camera to the position of the target entity)
		this.cameraCtrl_ = new CameraController(null);
		World.getInstance().addEntity(this.cameraCtrl_);
		this.cameraCtrl_.attachToEntity(this.freeCam_, new Vector(0, 0, 0));

		this.skyBox_ = new SkyBox();
		await this.skyBox_.load("data/textures/sky/1");
		World.getInstance().addEntity(this.skyBox_);

		const playerCar = new Car(new Vector(0, tc.maxElevation + 3, 0), Quat.identity());
		World.getInstance().addEntity(playerCar);

		// DEBUG---
		// const m: Mesh = Mesh.makeBox(new Vector(0, 0, 0), new Vector(1, 1, 1));
		// const boxShape = new Ammo.btBoxShape(new Ammo.btVector3(0.5, 0.5, 0.5));
		// const boxMass = 50;
		// const box = new RigidObject(m, new Vector(0, tc.maxElevation + 5, 0), boxShape, boxMass);
		// World.getInstance().addEntity(box);
		//---DEBUG

		console.log("Ready");
	}

	start(): void {
		console.log("Starting game...");
		assert(!this.started, "Game already started");
		this.started = true;
		this.onStart.trigger();
		console.log("Game started.");
	}

	stop(): void {
		console.log("Stopping game...");
		assert(this.started, "Game is not started");
		this.started = false;
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
	private started = false;
	terrain_: Terrain;
	skyBox_: SkyBox;
	// player_: Player;
	freeCam_: FreeCamera;
	cameraCtrl_: CameraController;
}
