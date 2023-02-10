import { Matrix } from "./math/matrix";
import { RenderContext } from "./render-context";
import { MeshRenderer } from "./render/mesh-renderer";
export function renderViewport(vp, scene) {
    const context = new RenderContext();
    context.activeViewport = vp;
    vp.prepareForRender();
    MeshRenderer.get().renderMesh(scene.testMesh, Matrix.identity(), context);
    vp.resetAfterRender();
}
//# sourceMappingURL=render.js.map