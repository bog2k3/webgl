import { TerrainConfig } from "./entities/terrain/config";
import { Game, GameState } from "./game";
import { GUI } from "./gui";
import { HtmlInputHandler, InputEvent, InputEventType } from "./input";
import { initGL } from "./joglfw/glcontext";
import { logprefix } from "./joglfw/log";
import { Shaders } from "./joglfw/render/shaders";
import { randi } from "./joglfw/utils/random";
import { World, WorldConfig } from "./joglfw/world/world";
import { initPhysics } from "./physics/physics";
import { RenderData } from "./render/render-data";
import { render2D, Render2dConfig, setContext2d } from "./render/render2d";
import { initRender, render3D, resetRenderSize } from "./render/render3d";
import { WebSock } from "./websock";

const console = logprefix("ROOT");

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

let canvas3D: HTMLCanvasElement;
let canvas2D: HTMLCanvasElement;

let lastTime = new Date();

let renderData: RenderData;
let resetRenderSizeTimeout = null;
let world: World;
let game: Game;
let inputHandler: HtmlInputHandler;
let isPaused = false;
let gameConfig: TerrainConfig = null;

const render2dConfig: Render2dConfig = {
	drawDebugText: false,
};

window.onload = main;
async function main(): Promise<void> {
	initWebSocket();
	canvas3D = document.getElementById("canvas3d") as HTMLCanvasElement;
	canvas2D = document.getElementById("canvas2d") as HTMLCanvasElement;
	adjustCanvasSize();
	window.onresize = adjustCanvasSize;
	await Promise.all([initGraphics(canvas2D, canvas3D), initPhysics()]);
	initInput(canvas2D);

	initWorld();

	game = new Game();
	await game.initialize();
	game.cameraCtrl.setTargetCamera(renderData.viewport.camera());
	game.onStart.add(onGameStarted);
	game.onStop.add(onGameEnded);

	initGui();

	requestAnimationFrame(step);
}

async function initGraphics(canvas2d: HTMLCanvasElement, canvas3d: HTMLCanvasElement): Promise<void> {
	const contextOptions: WebGLContextAttributes = {
		alpha: true,
		depth: true,
		preserveDrawingBuffer: true,
	};
	initGL(canvas3d, contextOptions);

	renderData = new RenderData(canvas3d.width, canvas3d.height);
	// renderData.config.renderPhysicsDebug = true;
	await initRender(renderData);

	setContext2d(canvas2d.getContext("2d"));
}

function step(): void {
	render3D(renderData, world);
	render2D(render2dConfig);
	const now = new Date();
	const dt = Math.min(100, now.getTime() - lastTime.getTime()) / 1000;
	lastTime = now;
	update(dt);
	// schedule next frame
	requestAnimationFrame(step);
}

function update(dt: number): void {
	for (let event of inputHandler.getEvents()) {
		handleInputEvent(event);
	}
	if (!isPaused) {
		game.update(dt);
		renderData.renderCtx.time += dt;
	} else if (game.playerInputHandler.getTargetObject() == game.freeCam) {
		// allow the free camera to move even when paused
		game.playerInputHandler.update(dt);
		game.freeCam.update(dt);
		game.cameraCtrl.update(dt);
	}
}

function onGameStarted(): void {
	game.terrain.setWaterReflectionTex(renderData.waterRenderData.reflectionFramebuffer.fbTexture());
	game.terrain.setWaterRefractionTex(
		renderData.waterRenderData.refractionFramebuffer.fbTexture(),
		game.skyBox.getCubeMapTexture(),
	);
	renderData.renderCtx.meshRenderer.setWaterNormalTexture(game.terrain.getWaterNormalTexture());
	renderData.renderCtx.enableWaterRender = true;
	renderData.skyBox = game.skyBox;
	renderData.terrain = game.terrain;
}

function onGameEnded(): void {
	renderData.renderCtx.meshRenderer.setWaterNormalTexture(null);
	renderData.renderCtx.enableWaterRender = false;
	renderData.skyBox = null;
	renderData.terrain = null;
}

function initInput(canvas: HTMLCanvasElement) {
	canvas.addEventListener("click", () => canvas.requestPointerLock());
	inputHandler = new HtmlInputHandler(canvas);
}

function handleInputEvent(ev: InputEvent): void {
	// propagate input events in order of priority:
	if (!ev.isConsumed() && ev.type === InputEventType.KeyDown) {
		handleSystemKeys(ev);
	}
	if (!ev.isConsumed()) {
		handlePlayerInputs(ev);
	}
}

function handleSystemKeys(ev: InputEvent): void {
	handleDebugKeys(ev);
}

function handleDebugKeys(ev: InputEvent) {
	switch (ev.keyCode) {
		case "KeyR":
			game.resetPlayer();
			break;
		case "KeyP":
			Shaders.reloadAllShaders();
			break;
		case "Tab":
			game.toggleCamera();
			break;
		case "Space":
			togglePause();
			break;
		default:
			return; // return without consuming the event if it's not handled
	}
	ev.consume();
}

function handlePlayerInputs(ev: InputEvent): void {
	game.playerInputHandler.handleInputEvent(ev);
}

function initWorld(): void {
	const worldConfig = new WorldConfig();
	worldConfig.drawBoundaries = true;
	world = new World(worldConfig);

	// auto pImgDebugDraw = new ImgDebugDraw();
	// World::setGlobal<ImgDebugDraw>(pImgDebugDraw);

	// const int margin = 20; // pixels
	// World::setGlobal<GuiSystem>(new GuiSystem(&renderData.viewport, {margin, margin}, {renderData.windowW - 2*margin, renderData.windowH - 2*margin}));
	// World::getGlobal<GuiSystem>()->onMousePointerDisplayRequest.add([](bool show) {
	// 	setMouseCapture(!show);
	// });
}

function togglePause(): void {
	isPaused = !isPaused;
}

function adjustCanvasSize(): void {
	const width: number = document.getElementById("canvas-container").clientWidth;
	const height: number = document.getElementById("canvas-container").clientHeight;
	canvas2D.width = width;
	canvas2D.height = height;
	canvas3D.width = width;
	canvas3D.height = height;
	if (renderData) {
		scheduleResetRenderSize(width, height);
	}
}

function scheduleResetRenderSize(newWidth: number, newHeight: number): void {
	if (resetRenderSizeTimeout) {
		clearTimeout(resetRenderSizeTimeout);
	}
	resetRenderSizeTimeout = setTimeout(() => {
		resetRenderSize(renderData, newWidth, newHeight);
		game.terrain.setWaterReflectionTex(renderData.waterRenderData.reflectionFramebuffer?.fbTexture());
		game.terrain.setWaterRefractionTex(
			renderData.waterRenderData.refractionFramebuffer?.fbTexture(),
			game.skyBox?.getCubeMapTexture(),
		);
	}, 500);
}

function joinGame(playerName: string): void {
	WebSock.authenticate(playerName);
	GUI.displayView(GUI.Views.PlayerNameDialog, false);
}

function terrainConfigReceived(cfg: TerrainConfig): void {
	if (cfg === null) {
		// the server has no config, we request to create one
		console.log(`No map config available, requesting to become master.`);
		WebSock.requestChangeConfig();
	} else {
		console.log(`Received map config from server (seed: ${cfg.seed}).`);
		gameConfig = cfg;
		game.updateConfig(cfg);
		GUI.updateMapParameters(cfg);
	}
}

function startTerrainConfig(isMaster: boolean): void {
	game.setState(GameState.CONFIGURE_TERRAIN);
	if (isMaster) {
		console.log(`[MASTER] We are master configurer.`);
		if (!gameConfig) {
			gameConfig = new TerrainConfig();
			gameConfig.seed = randi(0xffffffff);
		}
		game.updateConfig(gameConfig);
		WebSock.sendConfig(gameConfig);
		GUI.updateMapParameters(gameConfig);
	} else {
		console.log(`[SLAVE] Config started by another player.`);
	}
	GUI.displayView(GUI.Views.TerrainConfig, true);
	GUI.setTerrainConfigMode({ readonly: !isMaster });
}

function initWebSocket(): void {
	WebSock.init();
	WebSock.onMapConfigReceived.add(terrainConfigReceived);
	WebSock.onStartConfig.add(startTerrainConfig);
}

function initGui(): void {
	GUI.init();
	GUI.displayView(GUI.Views.PlayerNameDialog, true);
	GUI.onPlayerName.add(joinGame);
	GUI.onParameterChanged.add(terrainParamChanged);
}

let paramTimeout = null;
function terrainParamChanged(param: string, value: number): void {
	if (paramTimeout) {
		clearTimeout(paramTimeout);
	}
	// debounce
	paramTimeout = setTimeout(() => {
		console.log(`PARAM ${param} = ${value}`);
		switch (param) {
			case "seed":
				gameConfig.seed = value;
				break;
			case "min-elevation":
				gameConfig.minElevation = value;
				break;
			case "max-elevation":
				gameConfig.maxElevation = value;
				break;
			case "variation":
				gameConfig.variation = value;
				break;
			case "roughness":
				gameConfig.roughness = value;
				break;
		}
		game.updateConfig(gameConfig);
		WebSock.sendConfig(gameConfig);
	}, 300);
}
