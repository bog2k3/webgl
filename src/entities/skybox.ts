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
import { Entity } from "../joglfw/world/entity";
import { SkyboxShaderProgram } from "../render/programs/shader-skybox";
import { ShaderProgramManager } from "../render/shader-program-manager";
import { EntityTypes } from "./entity-types";

logprefix("SkyBox");

export class SkyBox extends Entity implements IRenderable, IGLResource {
	constructor() {
		super();
		this.renderData.shaderProgram = ShaderProgramManager.requestProgram(SkyboxShaderProgram);
		this.renderData.reloadHandler = this.renderData.shaderProgram.onProgramReloaded.add(() => {
			this.setupVAO();
		});
		this.setupVAO();

		this.renderData.screenQuad = Mesh.makeScreenQuad();

		// generate vertex data:
		// SkyBoxVertex verts[] {
		// 	// front face
		// 	{{-1.f, -1.f, +1.f}},	// bottom left
		// 	{{-1.f, +1.f, +1.f}},	// top left
		// 	{{+1.f, +1.f, +1.f}},	// top right
		// 	{{+1.f, -1.f, +1.f}},	// bottom right
		// 	// left face
		// 	{{-1.f, -1.f, -1.f}},	// bottom left
		// 	{{-1.f, +1.f, -1.f}},	// top left
		// 	{{-1.f, +1.f, +1.f}},	// top right
		// 	{{-1.f, -1.f, +1.f}},	// bottom right
		// 	// right face
		// 	{{+1.f, -1.f, +1.f}},	// bottom left
		// 	{{+1.f, +1.f, +1.f}},	// top left
		// 	{{+1.f, +1.f, -1.f}},	// top right
		// 	{{+1.f, -1.f, -1.f}},	// bottom right
		// 	// back face
		// 	{{+1.f, -1.f, -1.f}},	// bottom left
		// 	{{+1.f, +1.f, -1.f}},	// top left
		// 	{{-1.f, +1.f, -1.f}},	// top right
		// 	{{-1.f, -1.f, -1.f}},	// bottom right
		// 	// top face
		// 	{{-1.f, +1.f, +1.f}},	// bottom left
		// 	{{-1.f, +1.f, -1.f}},	// top left
		// 	{{+1.f, +1.f, -1.f}},	// top right
		// 	{{+1.f, +1.f, +1.f}},	// bottom right
		// };
		// glBindBuffer(GL_ARRAY_BUFFER, this.renderData.VBO);
		// glBufferData(GL_ARRAY_BUFFER, sizeof(verts), (void*)verts, GL_STATIC_DRAW);
		// glBindBuffer(GL_ARRAY_BUFFER, 0);

		// // generate index data
		// uint16_t inds[] {0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12,
		// 				13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19};
		// glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, this.renderData.IBO);
		// glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(inds), (void*)inds, GL_STATIC_DRAW);
		// glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);
	}

	override getType(): string {
		return EntityTypes.SkyBox;
	}

	override getAABB(): AABB {
		return AABB.empty();
	} // prevent the skybox being retrieved by spatial queries.

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
		if (this.renderData.screenQuad.vertexAttribsProgramBinding_ != this.renderData.shaderProgram) {
			const stride = SkyBoxVertex.getStride();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.renderData.screenQuad.getVBO());
			this.renderData.screenQuad.VAO.vertexAttribPointer(this.renderData.indexPos, 3, gl.FLOAT, false, stride, SkyBoxVertex.getOffset("pos"));
			this.renderData.screenQuad.vertexAttribsProgramBinding_ = this.renderData.shaderProgram;
			checkGLError("skybox attrib arrays setup");
		}
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.renderData.texture);
		this.renderData.shaderProgram.uniforms().setSkyboxSampler(0);
		this.renderData.shaderProgram.begin();

		const oldDepthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
		gl.depthMask(false);	// disable depth buffer writing

		gl.drawElements(gl.TRIANGLES, 30, gl.UNSIGNED_SHORT, 0);

		gl.depthMask(oldDepthMask);	// enable depth buffer writing

		this.renderData.shaderProgram.end();
		this.renderData.screenQuad.VAO.unbind();
	}

	// ------------------------ PRIVATE AREA ---------------------------- //

	private renderData = new SkyBoxRenderData();

	private setupVAO(): void {
		this.renderData.screenQuad.VAO.bind();
		// if (this.renderData.screenQuad.vertexAttribsProgramBinding_ != this.renderData.shaderProgram) {
		// 	const stride = SkyBoxVertex.getStride();
		// 	gl.bindBuffer(gl.ARRAY_BUFFER, this.renderData.screenQuad.getVBO());
		// 	this.renderData.screenQuad.VAO.vertexAttribPointer(this.renderData.indexPos, 3, gl.FLOAT, false, stride, SkyBoxVertex.getOffset("pos"));
		// 	this.renderData.screenQuad.vertexAttribsProgramBinding_ = this.renderData.shaderProgram;
		// 	checkGLError("skybox attrib arrays setup");
		// }

		// glBindVertexArray(this.renderData.VAO);
		// glBindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData.IBO);

		const mapVertexSources: Record<string, VertexAttribSource> = {
			"pos": { VBO: this.renderData.screenQuad.VBO, stride: SkyBoxVertex.getStride(), offset: SkyBoxVertex.getOffset("pos") },
		};
		this.renderData.shaderProgram.setupVertexStreams(this.renderData.screenQuad.VAO, mapVertexSources);

		this.renderData.screenQuad.VAO.unbind();
	}

	private loadTextures(baseUrl: string): Promise<void> {
		this.clear();
		std::string filenames[6] {
			path + "/right.png",	//X+
			path + "/left.png",		//X-
			path + "/top.png",		//Y+
			"",						//Y- not required
			path + "/front.png",	//Z+
			path + "/back.png",		//Z-
		};
	#warning "TODO optimize by loading only 5 textures and mapping them on the cube - no need for a cube-map"
		this.renderData.texture = TextureLoader::loadCubeFromPNG(filenames, true);
		if (!this.renderData.texture) {
			ERROR("Failed to load skybox textures from " << path);
			throw;
		}
		glBindTexture(gl.TEXTURE_CUBE_MAP, this.renderData.texture);
		//glTexParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		//glTexParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		glTexParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		glBindTexture(gl.TEXTURE_CUBE_MAP, 0);
	}

	private clear(): void {
		if (this.renderData.texture)
			gl.deleteTexture(this.renderData.texture);
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
			case "pos": return 0;
			default: throw new Error("Unknown field");
		}
	}

	getStride(): number {
		return SkyBoxVertex.getStride();
	}

	serialize(target: Float32Array, offset: number) {
		const values: number[] = [
			...this.pos.values(3)
		];
		target.set(values, offset);
	}
}

class SkyBoxRenderData {
	// VAO = new VertexArrayObject();
	// VBO = gl.createBuffer();
	// IBO = gl.createBuffer();
	screenQuad: Mesh;
	shaderProgram: SkyboxShaderProgram;
	reloadHandler: number;
	texture: WebGLTexture;
};