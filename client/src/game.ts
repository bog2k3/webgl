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

export enum GameState {
	CONFIGURE_TERRAIN,
	SPECTATE,
	PLAY,
}

export class Game {
	state = GameState.CONFIGURE_TERRAIN;
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
		this.terrain = new Terrain({ previewMode: true });

		World.getInstance().addEntity(this.terrain);
		World.getInstance().setGlobal(Terrain, this.terrain);

		this.freeCam = new FreeCamera(new Vector(0, 0, -1), new Vector(0, 0, 1));
		World.getInstance().addEntity(this.freeCam);

		// camera controller (this one moves the render camera to the position of the target entity)
		this.cameraCtrl = new CameraController(null);
		World.getInstance().addEntity(this.cameraCtrl);
		this.cameraCtrl.attachToEntity(this.freeCam);

		// this.skyBox = new SkyBox();
		// await this.skyBox.load("data/textures/sky/1");
		// World.getInstance().addEntity(this.skyBox);

		// this.playerCar = new Car(new Vector(0, tc.maxElevation + 3, 0), Quat.identity());
		// World.getInstance().addEntity(this.playerCar);
		// this.resetPlayer();

		// this.playerController = new PlayerController();
		// this.playerController.setTargetCar(this.playerCar);

		console.log("Ready");
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
				// AttachMode.ORBIT,
				AttachMode.FIXED,
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

	setState(state: GameState): void {
		if (this.state !== GameState.CONFIGURE_TERRAIN && state === GameState.CONFIGURE_TERRAIN) {
			this.stop();
		} else if (this.state === GameState.CONFIGURE_TERRAIN && state !== GameState.CONFIGURE_TERRAIN) {
			this.start();
		}
		this.state = state;
	}

	updateConfig(cfg: TerrainConfig): void {
		this.terrain.generate(cfg);
		this.terrain.finishGenerate();
		const cameraPos = new Vector(cfg.width / 1.4, cfg.maxElevation + 45, cfg.length / 1.4);
		this.freeCam.getTransform().moveTo(cameraPos);
		this.freeCam.getTransform().lookAt(cameraPos.add(new Vector(-1, -0.7, -1)));
		this.cameraCtrl.update(0);
	}

	// -------------------------- PRIVATE AREA ------------------------------- //

	private checkCameraCollision(prevPos: Vector, nextPos: Vector): Vector {
		if (!this.terrain) {
			return nextPos;
		}
		const terrainY = this.terrain.getHeightValue(nextPos);
		const MARGIN = 0.25;
		let nextY = nextPos.y;
		if (nextY < terrainY + MARGIN) {
			nextY = terrainY + MARGIN;
		}
		return nextPos.copy().setY(nextY);
	}

	private start(): void {
		console.log("Starting game...");
		assert(this.state == GameState.CONFIGURE_TERRAIN, "Game already started");
		// TODO recreate terrain without preview
		this.playerInputHandler.setTargetObject(this.freeCam);
		this.onStart.trigger();
		this.cameraCtrl.checkCollision = this.checkCameraCollision.bind(this);
		console.log("Game started.");
	}

	private stop(): void {
		console.log("Stopping game...");
		assert(this.state != GameState.CONFIGURE_TERRAIN, "Game is not started");
		this.playerInputHandler.setTargetObject(null);
		this.onStop.trigger();
		this.cameraCtrl.checkCollision = null;
		// TODO destroy all entities except terrain
		console.log("Game stopped.");
	}
}
