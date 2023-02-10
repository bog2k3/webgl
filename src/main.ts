import { ShaderWater } from './render/programs/shader-water';
import { ShaderTerrainPreview } from './render/programs/shader-terrain-preview';
import { ShaderProgramManager } from './render/shader-program-manager';
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

import { gl, initGL } from "./joglr/glcontext";
import { Mesh } from "./joglr/mesh";
import { MeshRenderer } from "./joglr/render/mesh-renderer";
import { World } from "./world/world";
import { Viewport } from "./joglr/viewport";
import { renderViewport } from "./world/render";
import { Vector } from "./joglr/math/vector";
import { StaticMesh } from "./world/entities/static-mesh.entity";
import { Matrix } from "./joglr/math/matrix";
import { DEBUG_ENTRY } from "./test";
import { ShaderTerrain } from "./render/programs/shader-terrain";
import { Shaders } from "./joglr/shaders";
import { defaultShaderPreprocessor } from "./joglr/default-shader-preprocessor";

const MOVE_SPEED = 0.5; // m/s

let lastTime = new Date();

let vp1: Viewport;
let world: World;
const keys = {};

window.onload = main;
async function main(): Promise<void> {
	const canvas = document.getElementById("canvas") as HTMLCanvasElement;
	await initGraphics(canvas);
	initializeScene();
	initInput(canvas);
	requestAnimationFrame(step);

	if (false) {
		DEBUG_ENTRY();
	}
}

async function initGraphics(canvas: HTMLCanvasElement): Promise<void> {
	const contextOptions: WebGLContextAttributes = {
		alpha: true,
		depth: true,
		preserveDrawingBuffer: true
	};
	initGL(canvas, contextOptions);

	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.FRONT);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);

	Mesh.ENABLE_COLOR_DEBUG = true;
	await MeshRenderer.initialize();

	Shaders.useShaderPreprocessor(defaultShaderPreprocessor);
	await ShaderProgramManager.loadProgram(ShaderTerrainPreview);
	// await ShaderProgramManager.loadProgram(ShaderTerrain);
	// await ShaderProgramManager.loadProgram(ShaderWater);
}

function step(): void {
	render();
	const now = new Date();
	const dt = Math.min(100, now.getTime() - lastTime.getTime()) / 1000;
	lastTime = now;
	update(dt);
	// schedule next frame
	requestAnimationFrame(step);
}

function render() {
	// clear screen
	gl.clearColor(1, 1, 1, 1);
	gl.clearDepth(1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	renderViewport(vp1, world);
	gl.flush();
}

function update(dt: number): void {
	if (keys['ArrowLeft']) {
		vp1.camera().move(vp1.camera().localX().scale(-MOVE_SPEED * dt));
	}

	if (keys['ArrowRight']) {
		vp1.camera().move(vp1.camera().localX().scale(+MOVE_SPEED * dt));
	}

	if (keys['ArrowUp']) {
		vp1.camera().move(vp1.camera().direction().scale(+MOVE_SPEED * dt));
	}
	if (keys['ArrowDown']) {
		vp1.camera().move(vp1.camera().direction().scale(-MOVE_SPEED * dt));
	}

	world.update(dt);
}

function initInput(canvas: HTMLCanvasElement) {
	document.onkeydown = (ev) => {
		keys[ev.key] = true;
	}
	document.onkeyup = (ev) => {
		keys[ev.key] = false;
	}
	canvas.addEventListener("click", () =>
		canvas.requestPointerLock()
	);
}

function initializeScene(): void {
	vp1 = new Viewport(0, 0, 1280, 720);
	world = new World();
	const m = Mesh.makeBox(new Vector(), new Vector(0.4, 0.4, 0.4));
	world.addEntity(new StaticMesh(m, Matrix.translate(new Vector(-0.5, +0.5))));
	world.addEntity(new StaticMesh(m, Matrix.translate(new Vector(+0.5, +0.5))));
	world.addEntity(new StaticMesh(m, Matrix.translate(new Vector(+0.5, -0.5))));
	world.addEntity(new StaticMesh(m, Matrix.translate(new Vector(-0.5, -0.5))));

	world.addEntity(new StaticMesh(m, Matrix.translate(new Vector(0, -1, 0)).mul(Matrix.scale(10, 0.1, 10))));
}
