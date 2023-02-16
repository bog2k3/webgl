import { checkGLError, gl } from "../joglfw/glcontext";
import { IGLResource } from "../joglfw/glresource";
import { logprefix } from "../joglfw/log";
import { AABB } from "../joglfw/math/aabb";
import { Mesh, MeshVertex } from "../joglfw/mesh";
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
		const oldDepthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
		gl.depthMask(false); // disable depth buffer writing

		this.renderData.shaderProgram.uniforms().setSkyboxSampler(0);
		this.renderData.shaderProgram.uniforms().setMatVPInverse(context.viewport.camera().matViewProj().inverse());
		this.renderData.shaderProgram.begin();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.renderData.texture);

		this.renderData.screenQuad.VAO.bind();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData.screenQuad.IBO);
		gl.drawElements(gl.TRIANGLES, this.renderData.screenQuad.getElementsCount(), gl.UNSIGNED_SHORT, 0);
		this.renderData.screenQuad.VAO.unbind();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		this.renderData.shaderProgram.end();

		gl.depthMask(oldDepthMask); // enable depth buffer writing
	}

	async load(baseUrl: string): Promise<void> {
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
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		checkGLError("SkyBox.load()::after");
	}

	// ------------------------ PRIVATE AREA ---------------------------- //

	private renderData = new SkyBoxRenderData();

	private setupVAO(): void {
		this.renderData.screenQuad.VAO.bind();
		const mapVertexSources: Record<string, VertexAttribSource> = {
			pos: {
				VBO: this.renderData.screenQuad.VBO,
				stride: MeshVertex.getStride(),
				offset: MeshVertex.getOffset("position"),
			},
		};
		this.renderData.shaderProgram.setupVertexStreams(this.renderData.screenQuad.VAO, mapVertexSources);
		this.renderData.screenQuad.VAO.unbind();
	}

	private clear(): void {
		if (this.renderData.texture) gl.deleteTexture(this.renderData.texture);
		this.renderData.texture = null;
	}
}

class SkyBoxRenderData {
	screenQuad: Mesh;
	shaderProgram: ShaderSkybox;
	reloadHandler: number;
	texture: WebGLTexture;
}
