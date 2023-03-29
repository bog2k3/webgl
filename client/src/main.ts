import { Game, GameState } from "./game";
import { GUI } from "./gui";
import { HtmlInputHandler, InputEvent, InputEventType } from "./input";
import { initGL } from "./joglfw/glcontext";
import { logprefix } from "./joglfw/log";
import { Shaders } from "./joglfw/render/shaders";
import { World, WorldConfig } from "./joglfw/world/world";
import { initPhysics } from "./physics/physics";
import { RenderData } from "./render/render-data";
import { render2D, Render2dConfig, setContext2d } from "./render/render2d";
import { initRender, render3D, resetRenderSize } from "./render/render3d";
import {
	randomizeConfig,
	startTerrainConfig,
	terrainConfigReceived,
	terrainParamChanged,
} from "./terrain-config-handler";
import { WebSock } from "./websock";
import { GlobalState } from "./global-state";

const console = logprefix("ROOT");

const ENABLE_DEBUG_KEYS = true;

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

let canvas3D: HTMLCanvasElement;
let canvas2D: HTMLCanvasElement;

const render2dConfig: Render2dConfig = {
	drawDebugText: false,
};

window.onload = main;
// prettier-ignore
async function main(): Promise<void> {
	initGui();
	GUI.displayView(GUI.Views.Loading, true);
	setTimeout(async () => {
		initWebSocket();
		canvas3D = document.getElementById("canvas3d") as HTMLCanvasElement;
		canvas2D = document.getElementById("canvas2d") as HTMLCanvasElement;
		adjustCanvasSize();
		window.onresize = adjustCanvasSize;
		await Promise.all([
			initGraphics(canvas2D, canvas3D),
			initPhysics()
		]);
		initWorld();
		initInput(canvas2D);
		await initGame();

		requestAnimationFrame(step);
		GUI.displayView(GUI.Views.Loading, false);
		GUI.displayView(GUI.Views.PlayerNameDialog, true);
	}, 0);
}

async function initGraphics(canvas2d: HTMLCanvasElement, canvas3d: HTMLCanvasElement): Promise<void> {
	const contextOptions: WebGLContextAttributes = {
		alpha: true,
		depth: true,
		preserveDrawingBuffer: true,
	};
	initGL(canvas3d, contextOptions);

	GlobalState.renderData = new RenderData(canvas3d.width, canvas3d.height);
	GlobalState.renderData.config.renderPhysicsDebug = false;
	await initRender(GlobalState.renderData);

	setContext2d(canvas2d.getContext("2d"));
}

function initInput(canvas: HTMLCanvasElement) {
	canvas.addEventListener("click", (event: PointerEvent) => handleCanvasClicked(canvas, event));
	document.addEventListener("pointerlockchange", pointerLockChanged);
	GlobalState.inputHandler = new HtmlInputHandler(canvas);
}

function initWorld(): void {
	const worldConfig = new WorldConfig();
	worldConfig.drawBoundaries = true;
	GlobalState.world = new World(worldConfig);

	// auto pImgDebugDraw = new ImgDebugDraw();
	// World::setGlobal<ImgDebugDraw>(pImgDebugDraw);
}

async function initGame(): Promise<void> {
	GlobalState.game = new Game();
	await GlobalState.game.initialize();
	GlobalState.game.cameraCtrl.setTargetCamera(GlobalState.renderData.viewport.camera());
	GlobalState.game.onStart.add(onGameStarted);
	GlobalState.game.onStop.add(onGameEnded);
}

function initWebSocket(): void {
	WebSock.init();
	WebSock.onMapConfigReceived.add(terrainConfigReceived);
	WebSock.onStartConfig.add(startTerrainConfig);
	WebSock.onStartGame.add(startGame);
}

function initGui(): void {
	GUI.init();
	GUI.onPlayerName.add(joinGame);
	GUI.onParameterChanged.add(terrainParamChanged);
	GUI.onRandomizeAll.add(randomizeConfig);
	GUI.onStartGame.add(() => WebSock.requestStartGame());
	GUI.onReturnToGame.add(() => returnToGame());
	GUI.onReqChangeConfig.add(() => requestChangeConfig());
}

let lastTime = new Date();
function step(): void {
	render3D(GlobalState.renderData, GlobalState.world);
	render2D(render2dConfig);
	const now = new Date();
	const dt = Math.min(100, now.getTime() - lastTime.getTime()) / 1000;
	lastTime = now;
	update(dt);
	// schedule next frame
	requestAnimationFrame(step);
}

function update(dt: number): void {
	for (let event of GlobalState.inputHandler.getEvents()) {
		handleInputEvent(event);
	}
	if (!GlobalState.isPaused) {
		GlobalState.game.update(dt);
		GlobalState.renderData.renderCtx.time += dt;
	} else if (GlobalState.game.playerInputHandler.getTargetObject() == GlobalState.game.freeCam) {
		// allow the free camera to move even when paused
		GlobalState.game.playerInputHandler.update(dt);
		GlobalState.game.freeCam.update(dt);
		GlobalState.game.cameraCtrl.update(dt);
	}
}

function onGameStarted(): void {
	GUI.displayView(GUI.Views.Loading, false);
	GlobalState.inputHandler.clear();
	GlobalState.game.terrain.setWaterReflectionTex(
		GlobalState.renderData.waterRenderData.reflectionFramebuffer.fbTexture(),
	);
	GlobalState.game.terrain.setWaterRefractionTex(
		GlobalState.renderData.waterRenderData.refractionFramebuffer.fbTexture(),
		GlobalState.game.skyBox.getCubeMapTexture(),
	);
	GlobalState.renderData.renderCtx.meshRenderer.setWaterNormalTexture(
		GlobalState.game.terrain.getWaterNormalTexture(),
	);
	GlobalState.renderData.renderCtx.enableWaterRender = true;
	GlobalState.renderData.skyBox = GlobalState.game.skyBox;
	GlobalState.renderData.terrain = GlobalState.game.terrain;
}

function onGameEnded(): void {
	GlobalState.renderData.renderCtx.meshRenderer.setWaterNormalTexture(null);
	GlobalState.renderData.renderCtx.enableWaterRender = false;
}

function handleCanvasClicked(canvas: HTMLCanvasElement, event: PointerEvent): void {
	if (!GUI.isViewVisible(GUI.Views.InGameMenu) && GlobalState.game.state !== GameState.CONFIGURE_TERRAIN) {
		canvas.requestPointerLock();
	}
}

function pointerLockChanged(): void {
	if (!document.pointerLockElement) {
		// pointer got unlocked, we display the menu
		if (GlobalState.game.state !== GameState.CONFIGURE_TERRAIN) {
			GUI.displayView(GUI.Views.InGameMenu, true);
		}
	}
}

function handleInputEvent(ev: InputEvent): void {
	// propagate input events in order of priority:
	if (!ev.isConsumed() && ev.type === InputEventType.KeyDown) {
		handleSystemKeys(ev);
	}
	if (!ev.isConsumed() && !GUI.isViewVisible(GUI.Views.InGameMenu)) {
		handlePlayerInputs(ev);
	}
}

function handleSystemKeys(ev: InputEvent): void {
	if (ENABLE_DEBUG_KEYS) {
		handleDebugKeys(ev);
	}
	if (ev.isConsumed()) {
		return;
	}
	switch (ev.keyCode) {
		// Add system keys here - keys that trigger menus or other stuff
		default:
			return;
	}
	ev.consume();
}

function handleDebugKeys(ev: InputEvent) {
	switch (ev.keyCode) {
		case "KeyR":
			GlobalState.game.resetPlayer();
			break;
		case "KeyP":
			Shaders.reloadAllShaders();
			break;
		case "Tab":
			GlobalState.game.toggleCamera();
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
	GlobalState.game.playerInputHandler.handleInputEvent(ev);
}

function togglePause(): void {
	GlobalState.isPaused = !GlobalState.isPaused;
}

function adjustCanvasSize(): void {
	const width: number = document.getElementById("canvas-container").clientWidth;
	const height: number = document.getElementById("canvas-container").clientHeight;
	canvas2D.width = width;
	canvas2D.height = height;
	canvas3D.width = width;
	canvas3D.height = height;
	if (GlobalState.renderData) {
		scheduleResetRenderSize(width, height);
	}
}

let resetRenderSizeTimeout = null;
function scheduleResetRenderSize(newWidth: number, newHeight: number): void {
	if (resetRenderSizeTimeout) {
		clearTimeout(resetRenderSizeTimeout);
	}
	resetRenderSizeTimeout = setTimeout(() => {
		resetRenderSize(GlobalState.renderData, newWidth, newHeight);
		if (GlobalState.game) {
			GlobalState.game.terrain.setWaterReflectionTex(
				GlobalState.renderData.waterRenderData.reflectionFramebuffer?.fbTexture(),
			);
			GlobalState.game.terrain.setWaterRefractionTex(
				GlobalState.renderData.waterRenderData.refractionFramebuffer?.fbTexture(),
				GlobalState.game.skyBox?.getCubeMapTexture(),
			);
		}
	}, 500);
}

function joinGame(playerName: string): void {
	GUI.displayView(GUI.Views.PlayerNameDialog, false);
	GUI.displayView(GUI.Views.Loading, true);
	setTimeout(() => WebSock.authenticate(playerName), 50);
}

function startGame(): void {
	GUI.displayView(GUI.Views.TerrainConfig, false);
	GUI.displayView(GUI.Views.Loading, true);
	setTimeout(() => GlobalState.game.setState(GameState.SPECTATE), 50);
}

function returnToGame(): void {
	GUI.displayView(GUI.Views.InGameMenu, false);
	canvas2D.requestPointerLock();
}

function requestChangeConfig(): void {
	GUI.displayView(GUI.Views.InGameMenu, false);
	GUI.displayView(GUI.Views.Loading, true);
	setTimeout(() => WebSock.requestChangeConfig(), 50);
}
