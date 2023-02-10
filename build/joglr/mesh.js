import { AbstractVertex } from "./abstract-vertex";
import { gl } from "./glcontext";
import { Vector } from "./math/vector";
export var MeshRenderModes;
(function (MeshRenderModes) {
    MeshRenderModes["Points"] = "points";
    MeshRenderModes["Lines"] = "lines";
    MeshRenderModes["Triangles"] = "triangles";
})(MeshRenderModes || (MeshRenderModes = {}));
;
export class MeshVertex extends AbstractVertex {
    static getSize() {
        return 4 * (3 + 3 + 2 + 4);
    }
    static getOffset(field) {
        switch (field) {
            case "position": return 0;
            case "normal": return 3;
            case "UV1": return 6;
            case "color": return 8;
            default: throw new Error(`Invalid field specified in MeshVertex.getOffset(): "${field}`);
        }
    }
    constructor(data) {
        super();
        Object.assign(this, data);
    }
    getSize() {
        return MeshVertex.getSize();
    }
    serialize(target, offset) {
        const values = [
            ...this.position.values(3),
            ...this.normal.values(3),
            ...this.UV1.values(2),
            ...this.color.values(4)
        ];
        target.set(values, offset);
    }
}
;
export class Mesh {
    constructor() {
        this.indexCount_ = 0;
        this.mode_ = MeshRenderModes.Triangles;
        this.VBO_ = gl.createBuffer();
        this.IBO_ = gl.createBuffer();
    }
    release() {
        gl.deleteBuffer(this.VBO_);
        gl.deleteBuffer(this.IBO_);
        this.VBO_ = this.IBO_ = null;
    }
    static makeBox(center, size) {
        const left = center.x - size.x * 0.5;
        const right = center.x + size.x * 0.5;
        const bottom = center.y - size.y * 0.5;
        const top = center.y + size.y * 0.5;
        const back = center.z - size.z * 0.5;
        const front = center.z + size.z * 0.5;
        const nBack = new Vector(0, 0, -1);
        const nFront = new Vector(0, 0, 1);
        const nLeft = new Vector(-1, 0, 0);
        const nRight = new Vector(1, 0, 0);
        const nTop = new Vector(0, 1, 0);
        const nBottom = new Vector(0, -1, 0);
        const white = new Vector(1, 1, 1, 1);
        const vertices = [
            new MeshVertex({
                position: new Vector(left, bottom, back),
                normal: nBack,
                UV1: new Vector(0, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, top, back),
                normal: nBack,
                UV1: new Vector(0, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, top, back),
                normal: nBack,
                UV1: new Vector(1, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, bottom, back),
                normal: nBack,
                UV1: new Vector(1, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, top, back),
                normal: nTop,
                UV1: new Vector(0, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, top, front),
                normal: nTop,
                UV1: new Vector(0, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, top, front),
                normal: nTop,
                UV1: new Vector(1, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, top, back),
                normal: nTop,
                UV1: new Vector(1, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, top, front),
                normal: nFront,
                UV1: new Vector(0, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, top, front),
                normal: nFront,
                UV1: new Vector(0, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, bottom, front),
                normal: nFront,
                UV1: new Vector(1, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, bottom, front),
                normal: nFront,
                UV1: new Vector(1, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, bottom, front),
                normal: nBottom,
                UV1: new Vector(0, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, bottom, back),
                normal: nBottom,
                UV1: new Vector(0, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, bottom, back),
                normal: nBottom,
                UV1: new Vector(1, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, bottom, front),
                normal: nBottom,
                UV1: new Vector(1, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, bottom, front),
                normal: nLeft,
                UV1: new Vector(0, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, top, front),
                normal: nLeft,
                UV1: new Vector(0, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, top, back),
                normal: nLeft,
                UV1: new Vector(1, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(left, bottom, back),
                normal: nLeft,
                UV1: new Vector(1, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, bottom, front),
                normal: nRight,
                UV1: new Vector(0, 0),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, top, front),
                normal: nRight,
                UV1: new Vector(0, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, top, back),
                normal: nRight,
                UV1: new Vector(1, 1),
                color: white
            }),
            new MeshVertex({
                position: new Vector(right, bottom, back),
                normal: nRight,
                UV1: new Vector(1, 0),
                color: white
            })
        ];
        if (true) {
            const c = [new Vector(1, 0, 0, 1), new Vector(0, 1, 0, 1), new Vector(0, 0, 1, 1), new Vector(1, 1, 0, 1)];
            for (let i = 0; i < vertices.length; i++) {
                vertices[i].color = c[i % c.length];
            }
        }
        const m = new Mesh();
        gl.bindBuffer(gl.ARRAY_BUFFER, m.VBO_);
        gl.bufferData(gl.ARRAY_BUFFER, AbstractVertex.arrayToBuffer(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        const indices = new Uint16Array([
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ]);
        m.indexCount_ = indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.IBO_);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        m.mode_ = MeshRenderModes.Triangles;
        return m;
    }
    static makeGizmo() {
        throw new Error("not implemented");
    }
    static makeSphere() {
        throw new Error("not implemented");
    }
}
Mesh.RenderModes = MeshRenderModes;
//# sourceMappingURL=mesh.js.map