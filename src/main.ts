import { Game } from "./game";
import { HtmlInputHandler, InputEvent, InputEventType } from "./input";
import { initGL } from "./joglfw/glcontext";
import { Matrix } from "./joglfw/math/matrix";
import { Quat } from "./joglfw/math/quat";
import { matrixToQuat, quatToMatrix } from "./joglfw/math/quat-functions";
import { Vector } from "./joglfw/math/vector";
import { Shaders } from "./joglfw/render/shaders";
import { World, WorldConfig } from "./joglfw/world/world";
import { initPhysics } from "./physics/physics";
import { initRender, render } from "./render/render";
import { RenderData } from "./render/render-data";

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

let lastTime = new Date();

let renderData: RenderData;
let world: World;
let game: Game;
let inputHandler: HtmlInputHandler;
let isPaused = false;

function runDebug(): void {
	const v = new Vector(0, 0, 1);
	const qx = Quat.axisAngle(new Vector(1, 0, 0), -Math.PI / 4);
	const qy = Quat.axisAngle(new Vector(0, 1, 0), -Math.PI / 2);
	const qz = Quat.axisAngle(new Vector(0, 0, 1), Math.PI / 6);
	console.log("v*qx", v.mulQ(qx));
	console.log("v*qy", v.mulQ(qy));
	console.log("v*qz", v.mulQ(qz));
	console.log("v*qx*qy", v.mulQ(qx).mulQ(qy));
	console.log("v*qy*qx", v.mulQ(qy).mulQ(qx));
	const qxy = qx.combine(qy);
	console.log("qxy", qxy);
	console.log("v*qxy", v.mulQ(qxy));
	const qyx = qy.combine(qx);
	console.log("qyx", qyx);
	console.log("v*qyx", v.mulQ(qyx));

	console.log("-------------------------------");

	const qxm = quatToMatrix(qx);
	console.log("qx_mat", qxm["m"]);
	console.log("rotx mat", Matrix.pitch(-Math.PI / 4)["m"]);

	const qym = quatToMatrix(qy);
	console.log("qy_mat", qym["m"]);
	console.log("roty mat", Matrix.yaw(-Math.PI / 2)["m"]);

	const qzm = quatToMatrix(qz);
	console.log("qz_mat", qzm["m"]);
	console.log("rotz mat", Matrix.roll(Math.PI / 6)["m"]);

	console.log("-------------------------------");

	const mxq = matrixToQuat(Matrix.pitch(-Math.PI / 4));
	console.log("qx", qx);
	console.log("matx -> q", mxq);
	const myq = matrixToQuat(Matrix.yaw(-Math.PI / 2));
	console.log("qy", qy);
	console.log("maty -> q", myq);
	const mzq = matrixToQuat(Matrix.roll(Math.PI / 6));
	console.log("qz", qz);
	console.log("matz -> q", mzq);
}

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
	await initRender(renderData);
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
	if (!isPaused) {
		game.update(dt);
	}
	renderData.renderCtx.time += dt;
}

function onGameStarted(): void {
	game.cameraCtrl.setTargetCamera(renderData.viewport.camera());
	game.terrain?.setWaterReflectionTex(renderData.waterRenderData.reflectionFramebuffer.fbTexture());
	// TODO activate these
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

function handleGUIInputs(ev: InputEvent): void {}

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

function togglePause() {
	isPaused = !isPaused;
}
