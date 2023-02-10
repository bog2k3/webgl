// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

import { gl, setGl } from "./joglr/glcontext";
import { renderViewport } from "./joglr/render";
import { MeshRenderer } from "./joglr/render/mesh-renderer";
import { SceneGraph } from "./joglr/scene-graph";
import { Viewport } from "./joglr/viewport";

let lastTime = new Date();

let vp1: Viewport;
let scene: SceneGraph;

window.onload = main;
async function main(): Promise<void> {
	await initGraphics();
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

	vp1 = new Viewport(0, 0, 1280, 720);
	scene = new SceneGraph();

	await MeshRenderer.initialize();
}

function step(): void {
	render();
	const now = new Date();
	const dt = Math.min(100, now.getTime() - lastTime.getTime()) / 1000;
	lastTime = now;
	update(dt);
	// schedule next frame
	// requestAnimationFrame(step);
}

function render() {
	// clear screen
	gl.clearColor(0, 0, 0, 1);
	gl.clearDepth(0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	renderViewport(vp1, scene);
}

function update(dt: number): void {
	scene.update(dt);
}

