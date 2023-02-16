import { checkGLError, gl } from "../joglfw/glcontext";
import { IGLResource } from "../joglfw/glresource";
import { logprefix } from "../joglfw/log";
import { AABB } from "../joglfw/math/aabb";
import { Vector } from "../joglfw/math/vector";
import { Mesh } from "../joglfw/mesh";
import { AbstractVertex } from "../joglfw/render/abstract-vertex";
import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { VertexAttribSource } from "../joglfw/render/shader-program";
import { TextureLoader } from "../joglfw/texture-loader";
import { Entity } from "../joglfw/world/entity";
import { ShaderSkybox } from "../render/programs/shader-skybox";
import { ShaderProgramManager } from "../render/shader-program-manager";
import { EntityTypes } from "./entity-types";

logprefix("SkyBox");

export class SkyBox extends Entity implements IRenderable, IGLResource {
	constructor() {
		super();
		this.renderData.shaderProgram = ShaderProgramManager.requestProgram(ShaderSkybox);
		this.renderData.screenQuad = Mesh.makeScreenQuad();
		this.renderData.reloadHandler = this.renderData.shaderProgram.onProgramReloaded.add(() => {
			this.setupVAO();
		});
		this.setupVAO();
	}

	override getType(): string {
		return EntityTypes.SkyBox;
	}

	override getAABB(): AABB {
		return AABB.empty(); // prevent the skybox being retrieved by spatial queries.
	}

	release(): void {
		this.clear();
		this.renderData.shaderProgram.onProgramReloaded.remove(this.renderData.reloadHandler);
		this.renderData.screenQuad.release();
		this.renderData = null;
	}

	render(context: RenderContext): void {
		if (!this.renderData.shaderProgram) {
			console.error("render(): Shader is not loaded");
			return;
		}
		this.renderData.screenQuad.VAO.bind();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData.screenQuad.IBO);
		// if (this.renderData.screenQuad.vertexAttribsProgramBinding_ != this.renderData.shaderProgram) {
		// const stride = SkyBoxVertex.getStride();
		// gl.bindBuffer(gl.ARRAY_BUFFER, this.renderData.screenQuad.getVBO());
		// this.renderData.screenQuad.VAO.vertexAttribPointer(
		// 	this.renderData.indexPos,
		// 	3,
		// 	gl.FLOAT,
		// 	false,
		// 	stride,
		// 	SkyBoxVertex.getOffset("pos"),
		// );
		// 	this.renderData.screenQuad.vertexAttribsProgramBinding_ = this.renderData.shaderProgram;
		// 	checkGLError("skybox attrib arrays setup");
		// }
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.renderData.texture);
		this.renderData.shaderProgram.uniforms().setSkyboxSampler(0);
		this.renderData.shaderProgram.begin();

		const oldDepthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
		gl.depthMask(false); // disable depth buffer writing

		gl.drawElements(gl.TRIANGLES, this.renderData.screenQuad.getElementsCount(), gl.UNSIGNED_SHORT, 0);

		gl.depthMask(oldDepthMask); // enable depth buffer writing

		this.renderData.shaderProgram.end();
		this.renderData.screenQuad.VAO.unbind();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	// ------------------------ PRIVATE AREA ---------------------------- //

	private renderData = new SkyBoxRenderData();

	private setupVAO(): void {
		this.renderData.screenQuad.VAO.bind();
		const mapVertexSources: Record<string, VertexAttribSource> = {
			pos: {
				VBO: this.renderData.screenQuad.VBO,
				stride: SkyBoxVertex.getStride(),
				offset: SkyBoxVertex.getOffset("pos"),
			},
		};
		this.renderData.shaderProgram.setupVertexStreams(this.renderData.screenQuad.VAO, mapVertexSources);
		this.renderData.screenQuad.VAO.unbind();
	}

	private async loadTextures(baseUrl: string): Promise<void> {
		this.clear();
		const urls: string[] = [
			baseUrl + "/right.png", //X+
			baseUrl + "/left.png", //X-
			baseUrl + "/top.png", //Y+
			"", //Y- not required
			baseUrl + "/front.png", //Z+
			baseUrl + "/back.png", //Z-
		];
		this.renderData.texture = await TextureLoader.loadCube(urls, true);
		if (!this.renderData.texture) {
			console.error("Failed to load skybox textures from ", baseUrl);
		}
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.renderData.texture);
		//glTexParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		//glTexParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, 0);
	}

	private clear(): void {
		if (this.renderData.texture) gl.deleteTexture(this.renderData.texture);
		this.renderData.texture = null;
	}
}

class SkyBoxVertex extends AbstractVertex {
	pos: Vector; // 3

	static getStride() {
		return 3 * 4;
	}

	static getOffset(field: keyof SkyBoxVertex): number {
		switch (field) {
			case "pos":
				return 0;
			default:
				throw new Error("Unknown field");
		}
	}

	getStride(): number {
		return SkyBoxVertex.getStride();
	}

	serialize(target: Float32Array, offset: number) {
		const values: number[] = [...this.pos.values(3)];
		target.set(values, offset);
	}
}

class SkyBoxRenderData {
	screenQuad: Mesh;
	shaderProgram: ShaderSkybox;
	reloadHandler: number;
	texture: WebGLTexture;
}
