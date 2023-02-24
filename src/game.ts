import { Car } from "./entities/car.entity";
import { FreeCamera } from "./entities/free-camera";
import { PlayerController } from "./entities/player.controller";
import { SkyBox } from "./entities/skybox";
import { TerrainConfig } from "./entities/terrain/config";
import { Terrain } from "./entities/terrain/terrain.entity";
import { logprefix } from "./joglfw/log";
import { Quat } from "./joglfw/math/quat";
import { Vector } from "./joglfw/math/vector";
import { assert } from "./joglfw/utils/assert";
import { Event } from "./joglfw/utils/event";
import { rand } from "./joglfw/utils/random";
import { AttachMode, CameraController } from "./joglfw/world/camera-controller";
import { World } from "./joglfw/world/world";
import { PlayerInputHandler } from "./player-input-handler";

const console = logprefix("Game");

export class Game {
	started = false;
	terrain: Terrain;
	skyBox: SkyBox;
	playerCar: Car;
	playerController: PlayerController;
	freeCam: FreeCamera;
	cameraCtrl: CameraController;
	playerInputHandler = new PlayerInputHandler();

	onStart = new Event<() => void>();
	onStop = new Event<() => void>();

	async initialize(): Promise<void> {
		console.log("Initializing");
		const tc = new TerrainConfig();
		tc.seed = rand();
		tc.vertexDensity = 0.5;
		tc.length = 100;
		tc.width = 100;
		tc.minElevation = -1.5;
		tc.maxElevation = 2;
		tc.seaFloorElevation = -10;
		tc.roughness = 0.8;
		this.terrain = new Terrain({ previewMode: false });
		this.terrain.generate(tc);
		this.terrain.finishGenerate();

		World.getInstance().addEntity(this.terrain);

		this.freeCam = new FreeCamera(
			// new Vector(tc.width / 1.8, tc.maxElevation + 20, tc.length / 1.8),
			new Vector(5, tc.maxElevation + 3, 5),
			new Vector(-1, -0.15, -1),
		);
		World.getInstance().addEntity(this.freeCam);

		// camera controller (this one moves the render camera to the position of the target entity)
		this.cameraCtrl = new CameraController(null);
		World.getInstance().addEntity(this.cameraCtrl);
		this.cameraCtrl.attachToEntity(this.freeCam);

		this.skyBox = new SkyBox();
		await this.skyBox.load("data/textures/sky/1");
		World.getInstance().addEntity(this.skyBox);

		this.playerCar = new Car(new Vector(0, tc.maxElevation + 3, 0), Quat.identity());
		World.getInstance().addEntity(this.playerCar);
		this.resetPlayer();

		this.playerController = new PlayerController();
		this.playerController.setTargetCar(this.playerCar);

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
		this.playerInputHandler.setTargetObject(this.freeCam);
		this.onStart.trigger();
		console.log("Game started.");
	}

	stop(): void {
		console.log("Stopping game...");
		assert(this.started, "Game is not started");
		this.started = false;
		this.playerInputHandler.setTargetObject(null);
		this.onStop.trigger();
		console.log("Game stopped.");
	}

	update(dt: number): void {
		this.playerInputHandler.update(dt);
		World.getInstance().update(dt);
	}

	resetPlayer(): void {
		const y = 3 + this.terrain.getHeightValue(new Vector(0, 0, 0));
		this.playerCar.teleport(new Vector(0, y, 0), Quat.identity());
		if (this.cameraCtrl.getAttachedEntity() === this.playerCar) {
			// this.cameraCtrl.setUpVectorMode(UpVectorMode.FLOATING); // reset the orientation
		}
	}

	toggleCamera(): void {
		if (this.cameraCtrl.getAttachedEntity() === this.freeCam) {
			// switch to car
			this.cameraCtrl.attachToEntity(
				this.playerCar,
				AttachMode.ORBIT,
				"camera-attachment",
				new Vector(0, 1.5, -4.5),
			);
			// this.cameraCtrl.setUpVectorMode(UpVectorMode.FLOATING);
			// this.cameraCtrl.setUpVectorMode(UpVectorMode.FREE);
			this.playerInputHandler.setTargetObject(this.playerController);
		} else {
			// switch to free-camera
			this.cameraCtrl.attachToEntity(this.freeCam, AttachMode.FIXED);
			// this.cameraCtrl.setUpVectorMode(UpVectorMode.FREE);
			this.playerInputHandler.setTargetObject(this.freeCam);
		}
	}
}
