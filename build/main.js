import { gl, setGl } from "./joglr/glcontext";
import { renderViewport } from "./joglr/render";
import { MeshRenderer } from "./joglr/render/mesh-renderer";
import { SceneGraph } from "./joglr/scene-graph";
import { Viewport } from "./joglr/viewport";
let lastTime = new Date();
let vp1;
let scene;
async function main() {
    await initGraphics();
    requestAnimationFrame(step);
}
document.onreadystatechange = main;
async function initGraphics() {
    const canvas = document.getElementById("canvas");
    const contextOptions = {
        alpha: true,
        depth: true,
        preserveDrawingBuffer: true
    };
    setGl(canvas.getContext("webgl2", contextOptions) || canvas.getContext("webgl", contextOptions));
    vp1 = new Viewport(0, 0, 1280, 720);
    scene = new SceneGraph();
    await MeshRenderer.initialize();
}
function step() {
    render();
    const now = new Date();
    const dt = Math.min(100, now.getTime() - lastTime.getTime()) / 1000;
    lastTime = now;
    update(dt);
    requestAnimationFrame(step);
}
function render() {
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    renderViewport(vp1, scene);
}
function update(dt) {
    scene.update(dt);
}
//# sourceMappingURL=main.js.map