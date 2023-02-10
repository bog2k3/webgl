import { Vector } from "./math/vector";
import { Mesh } from "./mesh";
export class SceneGraph {
    constructor() {
        this.testMesh = Mesh.makeBox(new Vector(0, 0, 0), new Vector(1, 1, 1));
    }
    update(dt) {
    }
}
//# sourceMappingURL=scene-graph.js.map