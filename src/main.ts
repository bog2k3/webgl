// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

import { gl, setGl } from "./joglr/glcontext";
import { Mesh } from "./joglr/mesh";
import { renderViewport } from "./joglr/render";
import { MeshRenderer } from "./joglr/render/mesh-renderer";
import { SceneGraph } from "./joglr/scene-graph";
import { Viewport } from "./joglr/viewport";

const MOVE_SPEED = 0.5; // m/s

let lastTime = new Date();

let vp1: Viewport;
let scene: SceneGraph;
const keys = {};

window.onload = main;
async function main(): Promise<void> {
	await initGraphics();
	initInput();
	requestAnimationFrame(step);
}

async function initGraphics(): Promise<void> {
	const canvas = document.getElementById("canvas") as HTMLCanvasElement;
	const contextOptions: WebGLContextAttributes = {
		alpha: true,
		depth: true,
		preserveDrawingBuffer: true
	};
	setGl(canvas.getContext("webgl2", contextOptions) || canvas.getContext("webgl", contextOptions));

	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.FRONT);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);

	Mesh.ENABLE_COLOR_DEBUG = true;

	vp1 = new Viewport(0, 0, 1280, 720);
	scene = new SceneGraph(vp1.camera());

	await MeshRenderer.initialize();
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

	renderViewport(vp1, scene);
	gl.flush();
}

function update(dt: number): void {
	if (keys['ArrowLeft']) {
		vp1.camera().move(vp1.camera().localX().scale(-MOVE_SPEED * dt));
		// console.log(`camera position: `, vp1.camera().position());
	}

	if (keys['ArrowRight']) {
		vp1.camera().move(vp1.camera().localX().scale(+MOVE_SPEED * dt));
		// console.log(`camera position: `, vp1.camera().position());
	}

	if (keys['ArrowUp']) {
		vp1.camera().move(vp1.camera().direction().scale(+MOVE_SPEED * dt));
		// console.log(`camera position: `, vp1.camera().position());
	}
	if (keys['ArrowDown']) {
		vp1.camera().move(vp1.camera().direction().scale(-MOVE_SPEED * dt));
		// console.log(`camera position: `, vp1.camera().position());
	}

	scene.update(dt);
}

function initInput() {
	document.onkeydown = (ev) => {
		keys[ev.key] = true;
	}
	document.onkeyup = (ev) => {
		keys[ev.key] = false;
	}
}