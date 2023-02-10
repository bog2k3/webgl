import { AbstractVertex } from "./abstract-vertex";
import { IGLResource } from "./glresource";
import { Vector } from "./math/vector";
export declare enum MeshRenderModes {
    Points = "points",
    Lines = "lines",
    Triangles = "triangles"
}
export declare class MeshVertex extends AbstractVertex {
    position: Vector;
    normal: Vector;
    UV1: Vector;
    color: Vector;
    static getSize(): number;
    static getOffset(field: keyof MeshVertex): number;
    constructor(data: Partial<MeshVertex>);
    getSize(): number;
    serialize(target: Float32Array, offset: number): void;
}
export declare class Mesh implements IGLResource {
    static RenderModes: typeof MeshRenderModes;
    constructor();
    release(): void;
    static makeBox(center: Vector, size: Vector): Mesh;
    static makeGizmo(): Mesh;
    static makeSphere(): Mesh;
    VBO_: WebGLBuffer;
    IBO_: WebGLBuffer;
    indexCount_: number;
    mode_: MeshRenderModes;
}
