import { Matrix } from "../math/matrix";
import { Mesh } from "../mesh";
import { RenderContext } from "../render-context";
export declare class MeshRenderer {
    private static instance_;
    static get(): MeshRenderer;
    static initialize(): Promise<void>;
    private meshShaderProgram_;
    private indexPos_;
    private indexNorm_;
    private indexUV1_;
    private indexColor_;
    private indexMatPVW_;
    renderMesh(mesh: Mesh, worldTransform: Matrix, context: RenderContext): void;
    private initialize;
}
