import { Terrain } from "./entities/terrain/terrain.entity";
import { Water } from "./entities/terrain/water";
import { Game } from "./game";
import { HtmlInputHandler, InputEvent, InputEventType } from "./input";
import { initGL } from "./joglfw/glcontext";
import { Mesh } from "./joglfw/mesh";
import { MeshRenderer } from "./joglfw/render/mesh-renderer";
import { Shaders } from "./joglfw/render/shaders";
import { ShapeRenderer } from "./joglfw/render/shape-renderer";
import { World, WorldConfig } from "./joglfw/world/world";
import { initPhysics } from "./physics/physics";
import { PlayerInputHandler } from "./player-input-handler";
import { ShaderSkybox } from "./render/programs/shader-skybox";
import { ShaderTerrain } from "./render/programs/shader-terrain";
import { ShaderTerrainPreview } from "./render/programs/shader-terrain-preview";
import { ShaderWater } from "./render/programs/shader-water";
import { initRender, render } from "./render/render";
import { RenderData } from "./render/render-data";
import { ShaderProgramManager } from "./render/shader-program-manager";

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

let lastTime = new Date();

let renderData: RenderData;
let world: World;
let game: Game;
let inputHandler: HtmlInputHandler;
let playerInputHandler: PlayerInputHandler;

window.onload = main;
async function main(): Promise<void> {
	const canvas = document.getElementById("canvas") as HTMLCanvasElement;
	await initGraphics(canvas);
	initInput(canvas);
	await initPhysics();

	initWorld();

	game = new Game();
	await game.initialize();
	game.onStart.add(onGameStarted);
	game.onStop.add(onGameEnded);
	game.start();

	requestAnimationFrame(step);
}

async function initGraphics(canvas: HTMLCanvasElement): Promise<void> {
	const contextOptions: WebGLContextAttributes = {
		alpha: true,
		depth: true,
		preserveDrawingBuffer: true,
	};
	initGL(canvas, contextOptions);

	renderData = new RenderData(canvas.width, canvas.height);
	// renderData.config.renderPhysicsDebug = true;
	initRender(renderData);

	Mesh.ENABLE_COLOR_DEBUG = true;
	await MeshRenderer.initialize();

	await ShaderProgramManager.loadProgram(ShaderTerrainPreview);
	await ShaderProgramManager.loadProgram(ShaderTerrain);
	await ShaderProgramManager.loadProgram(ShaderSkybox);
	await ShaderProgramManager.loadProgram(ShaderWater);

	await loadTextures();
	await ShapeRenderer.initialize();
}

function step(): void {
	render(renderData, world);
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
	playerInputHandler.update(dt);
	world.update(dt);
	renderData.renderCtx.time += dt;
}

function onGameStarted(): void {
	playerInputHandler.setTargetObject(game.freeCam());
	game.cameraCtrl().setTargetCamera(renderData.viewport.camera());
	game.terrain()?.setWaterReflectionTex(renderData.waterRenderData.reflectionFramebuffer.fbTexture());
	// TODO activate these
	game.terrain().setWaterRefractionTex(
		renderData.waterRenderData.refractionFramebuffer.fbTexture(),
		game.skyBox().getCubeMapTexture(),
	);
	renderData.renderCtx.meshRenderer.setWaterNormalTexture(game.terrain().getWaterNormalTexture());
	renderData.renderCtx.enableWaterRender = true;
	renderData.skyBox = game.skyBox();
	renderData.terrain = game.terrain();
}

function onGameEnded(): void {
	playerInputHandler.setTargetObject(null);
	renderData.renderCtx.meshRenderer.setWaterNormalTexture(null);
	renderData.renderCtx.enableWaterRender = false;
	renderData.skyBox = null;
	renderData.terrain = null;
}

function initInput(canvas: HTMLCanvasElement) {
	canvas.addEventListener("click", () => canvas.requestPointerLock());
	inputHandler = new HtmlInputHandler(canvas);
	playerInputHandler = new PlayerInputHandler();
}

function handleInputEvent(ev: InputEvent): void {
	// propagate input events in order of priority:
	if (!ev.isConsumed() && ev.type === InputEventType.KeyDown) {
		handleSystemKeys(ev);
	}
	if (!ev.isConsumed()) {
		handleGUIInputs(ev);
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
			Shaders.reloadAllShaders();
			break;
		default:
			return; // return without consuming the event if it's not handled
	}
	ev.consume();
}

function handleGUIInputs(ev: InputEvent): void {}

function handlePlayerInputs(ev: InputEvent): void {
	playerInputHandler.handleInputEvent(ev);
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

function loadTextures(): Promise<void> {
	// prettier-ignore
	return Promise.all([
		Terrain.loadTextures(0),
		Water.loadTextures(0)
	]).then();
}
