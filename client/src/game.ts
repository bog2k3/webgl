import { Car } from "./entities/car.entity";
import { EntityTypes } from "./entities/entity-types";
import { FreeCamera } from "./entities/free-camera";
import { PlayerController } from "./entities/player.controller";
import { Projectile } from "./entities/projectile.entity";
import { SkyBox } from "./entities/skybox";
import { TerrainConfig } from "./entities/terrain/config";
import { Terrain } from "./entities/terrain/terrain.entity";
import { GlobalState } from "./global-state";
import { logprefix } from "./joglfw/log";
import { Quat } from "./joglfw/math/quat";
import { Vector } from "./joglfw/math/vector";
import { Event } from "./joglfw/utils/event";
import { AttachMode, CameraController } from "./joglfw/world/camera-controller";
import { Entity } from "./joglfw/world/entity";
import { World } from "./joglfw/world/world";
import { CollisionChecker } from "./physics/collision-checker";
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
	playerController = new PlayerController();
	freeCam: FreeCamera;
	cameraCtrl: CameraController;
	playerInputHandler = new PlayerInputHandler();
	collisionChecker = new CollisionChecker();

	/** these are entities that are never destroyed */
	readonly godEntities: Entity[] = [];

	onStateChanged = new Event<(state: GameState, prevState: GameState) => void>();

	constructor() {
		this.setupNetworkManagerFactories();
	}

	async initialize(): Promise<void> {
		console.log("Initializing");
		this.terrain = new Terrain({ previewMode: true });

		World.getInstance().addEntity(this.terrain);
		World.setGlobal(Terrain, this.terrain);
		this.godEntities.push(this.terrain);

		this.freeCam = new FreeCamera(new Vector(0, 0, -1), new Vector(0, 0, 1));
		World.getInstance().addEntity(this.freeCam);
		this.godEntities.push(this.freeCam);

		// camera controller (this one moves the render camera to the position of the target entity)
		this.cameraCtrl = new CameraController(null);
		World.getInstance().addEntity(this.cameraCtrl);
		this.godEntities.push(this.cameraCtrl);
		this.cameraCtrl.attachToEntity(this.freeCam);

		console.log("Ready");
	}

	update(dt: number): void {
		this.playerInputHandler.update(dt);
		World.getInstance().update(dt);
		this.collisionChecker.update(dt);
	}

	resetPlayer(): void {
		if (this.state === GameState.CONFIGURE_TERRAIN) {
			return;
		}
		const y = 3 + this.terrain.getHeightValue(new Vector(0, 0, 0));
		this.playerCar.teleport(new Vector(0, y, 0), Quat.identity());
		if (this.cameraCtrl.getAttachedEntity() === this.playerCar) {
			// this.cameraCtrl.setUpVectorMode(UpVectorMode.FLOATING); // reset the orientation
		}
	}

	toggleCamera(): void {
		if (this.state === GameState.CONFIGURE_TERRAIN) {
			return;
		}
		if (this.cameraCtrl.getAttachedEntity() === this.playerCar) {
			// TODO toggle between different camera positions
		}
	}

	async setState(state: GameState): Promise<void> {
		if (state === this.state) {
			return;
		}
		const oldState = this.state;
		this.state = state;
		if (oldState !== GameState.CONFIGURE_TERRAIN && state === GameState.CONFIGURE_TERRAIN) {
			await this.stop();
		} else if (oldState === GameState.CONFIGURE_TERRAIN && state !== GameState.CONFIGURE_TERRAIN) {
			await this.start();
		}
		if (this.state === GameState.PLAY) {
			this.spawnPlayer();
			this.switchToPlayerCamera();
		}
		if (this.state === GameState.SPECTATE) {
			if (this.playerCar) {
				this.playerCar.destroy();
				this.playerController.setTargetCar(null);
				this.playerCar = null;
			}
			this.switchToFreeCamera();
		}
		this.onStateChanged.trigger(state, oldState);
	}

	updateConfig(cfg: TerrainConfig): void {
		this.terrain.generate(cfg);
		this.terrain.finishGenerate();
		this.positionExhibitCamera(cfg, 1.3, 80);
	}

	// -------------------------- PRIVATE AREA ------------------------------- //

	private setupNetworkManagerFactories(): void {
		GlobalState.networkManager.addEntityFactory(EntityTypes.Car, Car.deserialize);
		GlobalState.networkManager.addEntityFactory(EntityTypes.Projectile, Projectile.deserialize);
	}

	private checkCameraCollision(prevPos: Vector, nextPos: Vector): Vector {
		if (!this.terrain) {
			return nextPos;
		}
		const terrainY = this.terrain.getHeightValue(nextPos);
		const MARGIN = 0.35;
		let nextY = nextPos.y;
		if (nextY < terrainY + MARGIN) {
			nextY = terrainY + MARGIN;
		}
		return nextPos.copy().setY(nextY);
	}

	private start(): Promise<void> {
		console.log("Starting game...");
		this.playerInputHandler.setTargetObject(this.freeCam);
		this.cameraCtrl.checkCollision = this.checkCameraCollision.bind(this);

		let skyboxPromise = Promise.resolve();
		if (!this.skyBox) {
			this.skyBox = new SkyBox();
			skyboxPromise = this.skyBox.load("data/textures/sky/1");
			this.godEntities.push(this.skyBox);
		}
		World.getInstance().addEntity(this.skyBox);

		this.terrain.setPreviewMode(false);
		this.terrain.regenerate();
		// TODO here we tamper with the terrain, add buildings & vegetation
		this.terrain.finishGenerate();

		this.positionExhibitCamera(this.terrain.getConfig(), 0.8, 30);

		return skyboxPromise.then(() => {
			console.log("Game started.");
		});
	}

	private stop(): Promise<void> {
		console.log("Stopping game...");
		this.playerCar = null;
		this.cameraCtrl.checkCollision = null;
		this.switchToFreeCamera();
		this.playerInputHandler.setTargetObject(null);
		this.playerController.setTargetCar(null);
		// destroy all entities except god entities
		for (let e of this.godEntities) {
			World.getInstance().removeEntity(e);
		}
		World.getInstance().reset();
		for (let e of this.godEntities) {
			World.getInstance().addEntity(e);
		}
		this.terrain.setPreviewMode(true);
		this.terrain.regenerate();
		this.terrain.finishGenerate();
		console.log("Game stopped.");
		return Promise.resolve();
	}

	private positionExhibitCamera(cfg: TerrainConfig, distanceScale: number, height: number): void {
		const cameraPos = new Vector(cfg.width * 0.39 * distanceScale, height, cfg.length * 0.39 * distanceScale);
		this.freeCam.getTransform().moveTo(cameraPos);
		this.freeCam.getTransform().lookAt(new Vector(0));
		this.cameraCtrl.update(0);
	}

	private spawnPlayer(): void {
		if (this.playerCar) {
			throw new Error("Player already spawned");
		}
		const position = new Vector(0, this.terrain.getConfig().maxElevation + 3, 0);
		const orientation = Quat.identity();
		this.playerCar = new Car(GlobalState.playerName, position, orientation);
		World.getInstance().addEntity(this.playerCar);
		this.resetPlayer();
		this.playerController.setTargetCar(this.playerCar);
	}

	private switchToFreeCamera(): void {
		this.cameraCtrl.attachToEntity(this.freeCam, AttachMode.FIXED);
		// this.cameraCtrl.setUpVectorMode(UpVectorMode.FREE);
		this.playerInputHandler.setTargetObject(this.freeCam);
	}

	private switchToPlayerCamera(): void {
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
	}
}
