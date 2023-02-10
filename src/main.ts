import { initGL } from "./joglr/glcontext";
import { Mesh } from "./joglr/mesh";
import { MeshRenderer } from "./joglr/render/mesh-renderer";
import { ShaderTerrainPreview } from "./render/programs/shader-terrain-preview";
import { initRender, render } from "./render/render";
import { RenderData } from "./render/render-data";
import { ShaderProgramManager } from "./render/shader-program-manager";
import { DEBUG_ENTRY } from "./test";
import { World, WorldConfig } from "./joglr/world/world";
import { Shaders } from "./joglr/render/shaders";
import { Terrain } from "./entities/terrain/terrain.entity";

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

const MOVE_SPEED = 0.5; // m/s

let lastTime = new Date();

let renderData: RenderData;
let world: World;
const keys = {};

window.onload = main;
async function main(): Promise<void> {
	const canvas = document.getElementById("canvas") as HTMLCanvasElement;
	await initGraphics(canvas);
	initializeWorld();
	initInput(canvas);
	requestAnimationFrame(step);

	if (true) {
		DEBUG_ENTRY();
	}
}

async function initGraphics(canvas: HTMLCanvasElement): Promise<void> {
	const contextOptions: WebGLContextAttributes = {
		alpha: true,
		depth: true,
		preserveDrawingBuffer: true,
	};
	initGL(canvas, contextOptions);

	renderData = new RenderData(canvas.width, canvas.height);
	initRender(renderData);

	Mesh.ENABLE_COLOR_DEBUG = true;
	await MeshRenderer.initialize();

	await ShaderProgramManager.loadProgram(ShaderTerrainPreview);
	// await ShaderProgramManager.loadProgram(ShaderTerrain);
	// await ShaderProgramManager.loadProgram(ShaderWater);

	await loadTextures();
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
	if (keys["ArrowLeft"]) {
		renderData.viewport.camera().move(
			renderData.viewport
				.camera()
				.localX()
				.scale(-MOVE_SPEED * dt),
		);
	}

	if (keys["ArrowRight"]) {
		renderData.viewport.camera().move(
			renderData.viewport
				.camera()
				.localX()
				.scale(+MOVE_SPEED * dt),
		);
	}

	if (keys["ArrowUp"]) {
		renderData.viewport.camera().move(
			renderData.viewport
				.camera()
				.direction()
				.scale(+MOVE_SPEED * dt),
		);
	}
	if (keys["ArrowDown"]) {
		renderData.viewport.camera().move(
			renderData.viewport
				.camera()
				.direction()
				.scale(-MOVE_SPEED * dt),
		);
	}

	world.update(dt);
}

function initInput(canvas: HTMLCanvasElement) {
	document.onkeydown = (ev) => {
		keys[ev.key] = true;
		handleKey(ev);
	};
	document.onkeyup = (ev) => {
		keys[ev.key] = false;
		handleKey(ev);
	};
	canvas.addEventListener("click", () => canvas.requestPointerLock());
}

function handleKey(ev: KeyboardEvent): void {
	// propagate input events in order of priority:
	let consumed = false;
	if (!consumed && ev.type === "keydown") {
		consumed = handleSystemKeys(ev);
	}
	if (!consumed && !ev["isConsumed"]) {
		consumed = handleGUIInputs(ev);
	}
	if (!consumed && !ev["isConsumed"]) {
		consumed = handlePlayerInputs(ev);
	}
}

function handleSystemKeys(ev: KeyboardEvent): boolean {
	return handleDebugKeys(ev);
}

function handleDebugKeys(ev: KeyboardEvent): boolean {
	switch (ev.key) {
		case "R":
		case "r":
			Shaders.reloadAllShaders();
			return true;
	}
	return false;
}

function handleGUIInputs(ev: KeyboardEvent): boolean {
	return false;
}

function handlePlayerInputs(ev: KeyboardEvent): boolean {
	return false;
}

function initializeWorld(): void {
	const worldConfig = new WorldConfig();
	worldConfig.drawBoundaries = false;
	world = new World(worldConfig);
}

async function loadTextures() {
	let progress = await Terrain.loadTextures(0);
	while (progress.completed < progress.total) {
		progress = await Terrain.loadTextures(progress.completed);
	}
}
