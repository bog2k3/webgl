import { checkGLError, gl } from "../../joglfw/glcontext";
import { IGLResource } from "../../joglfw/glresource";
import { Vector } from "../../joglfw/math/vector";
import { AbstractVertex } from "../../joglfw/render/abstract-vertex";
import { RenderContext } from "../../joglfw/render/render-context";
import { IRenderable } from "../../joglfw/render/renderable";
import { VertexAttribSource } from "../../joglfw/render/shader-program";
import { VertexArrayObject } from "../../joglfw/render/vao";
import { TextureLoader } from "../../joglfw/texture-loader";
import { assert } from "../../joglfw/utils/assert";
import { srand } from "../../joglfw/utils/random";
import { Progress } from "../../progress";
import { ShaderWater } from "../../render/programs/shader-water";
import { ShaderProgramManager } from "../../render/shader-program-manager";
import { Triangle, triangulate } from "./triangulation";

export class WaterConfig {
	innerRadius = 50.0; // radius of 'detailed' water mesh -> should cover the playable area
	outerExtent = 100.0; // extend from the innerRadius to make the water appear infinite - this area will have fewer vertices
	vertexDensity = 0.1; // vertices per meter
	constrainToCircle = false; // true to enable detailed vertex generation only within the circle of radius 'innerRadius'
	// if false, a square of length 2*innerRadius will be used instead (faster)
}
export class Water implements IRenderable, IGLResource {
	static async loadTextures(step: number): Promise<Progress> {
		switch (step) {
			case 0:
				WaterRenderData.textureNormal = (
					await TextureLoader.load("data/textures/water/normal.png", false)
				).texture;
				gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureNormal);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); //gl.NEAREST_MIPMAP_LINEAR);// gl.LINEAR_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				break;
			case 1:
				WaterRenderData.textureFoam = (await TextureLoader.load("data/textures/water/foam.png", true)).texture;
				gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureFoam);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				break;
		}
		gl.bindTexture(gl.TEXTURE_2D, null);

		return { completed: step + 1, total: 2 };
	}

	static unloadAllResources(): void {
		for (let tex of [WaterRenderData.textureFoam, WaterRenderData.textureNormal]) {
			gl.deleteTexture(tex);
		}
	}

	constructor() {
		this.renderData = new WaterRenderData();
		this.renderData.shaderProgram = ShaderProgramManager.requestProgram<ShaderWater>(ShaderWater);
		this.renderData.VAO = new VertexArrayObject();
		this.renderData.VBO = gl.createBuffer();
		this.renderData.IBO = gl.createBuffer();

		this.renderData.reloadHandler = this.renderData.shaderProgram.onProgramReloaded.add(() => {
			this.setupVAO();
		});
		this.setupVAO();
	}

	setupVAO(): void {
		const mapVertexSources: Record<string, VertexAttribSource> = {
			pos: { VBO: this.renderData.VBO, stride: WaterVertex.getStride(), offset: WaterVertex.getOffset("pos") },
			fog: { VBO: this.renderData.VBO, stride: WaterVertex.getStride(), offset: WaterVertex.getOffset("fog") },
		};
		this.renderData.shaderProgram.setupVertexStreams(this.renderData.VAO, mapVertexSources);
	}

	release(): void {
		if (this.renderData) {
			this.renderData.shaderProgram.onProgramReloaded.remove(this.renderData.reloadHandler);
			this.renderData = null;
		}
	}

	render(context: RenderContext): void {
		return;
		if (!this.renderData.shaderProgram.isValid()) {
			return;
		}
		// configure backface culling
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		// set-up textures
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureNormal);
		this.renderData.shaderProgram.uniforms().setWaterNormalTexSampler(0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.renderData.textureReflection);
		this.renderData.shaderProgram.uniforms().setReflectionTexSampler(1);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.renderData.textureRefraction);
		this.renderData.shaderProgram.uniforms().setRefractionTexSampler(2);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.renderData.textureRefractionCube);
		this.renderData.shaderProgram.uniforms().setRefractionCubeTexSampler(3);
		gl.activeTexture(gl.TEXTURE4);
		gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureFoam);
		this.renderData.shaderProgram.uniforms().setFoamTexSampler(4);

		// set-up shader and vertex buffer
		this.renderData.shaderProgram.begin();
		this.renderData.VAO.bind();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData.IBO);
		// do the drawing
		gl.drawElements(gl.TRIANGLES, this.triangles.length * 3, gl.UNSIGNED_SHORT, 0);
		// unbind stuff
		this.renderData.VAO.unbind();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		this.renderData.shaderProgram.end();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);

		gl.enable(gl.CULL_FACE);
		gl.disable(gl.BLEND);

		checkGLError("Water.render()");
	}

	generate(config: WaterConfig): void {
		this.validateConfig(config);
		this.clear();
		this.config = config;

		// TODO implement constrainToCircle

		const rows: number = Math.ceil(2 * config.innerRadius * config.vertexDensity) + 1;
		const cols: number = Math.ceil(2 * config.innerRadius * config.vertexDensity) + 1;

		// generate 'skirt' vertices that will surround the main water body to the outerExtent
		const extentRadius = config.innerRadius + config.outerExtent;
		const skirtVertSpacing = 30; // meters
		const nSkirtVerts = Math.floor((2 * Math.PI * extentRadius) / skirtVertSpacing);
		const skirtVertSector = (2 * Math.PI) / nSkirtVerts; // sector size between two skirt vertices
		this.vertices = new Array(rows * cols + 2 * nSkirtVerts);

		const topleft = new Vector(-config.innerRadius, 0, -config.innerRadius);
		const dx = (config.innerRadius * 2) / (cols - 1);
		const dz = (config.innerRadius * 2) / (rows - 1);
		const wTexW = 100; // world width of water texture
		const wTexH = 100; // world height of water texture
		// compute water vertices
		for (let i = 0; i < rows; i++)
			for (let j = 0; j < cols; j++) {
				const jitter = new Vector((srand() * 0.1, srand() * 0.1));
				this.vertices[i * rows + j] = new WaterVertex({
					pos: topleft.add(new Vector(dx * j + jitter.x, 0, dz * i + jitter.y)), // position
					fog: 0, // fog
				});
			}
		// compute skirt vertices
		for (let i = 0; i < nSkirtVerts; i++) {
			const jitter = new Vector(srand() * 0.1, srand() * 0.1);
			let x = extentRadius * Math.cos(i * skirtVertSector) + jitter.x;
			let z = extentRadius * Math.sin(i * skirtVertSector) + jitter.y;
			this.vertices[rows * cols + i] = new WaterVertex({
				pos: new Vector(x, 0, z), // position
				fog: 0, //1																	// fog
			});

			x = (extentRadius + 50) * Math.cos(i * skirtVertSector) - jitter.x;
			z = (extentRadius + 50) * Math.sin(i * skirtVertSector) - jitter.y;
			this.vertices[rows * cols + i + nSkirtVerts] = new WaterVertex({
				pos: new Vector(x, 20, z), // position
				fog: 1, // fog
			});
		}

		this.triangles = triangulate(this.vertices, (v: WaterVertex, n: number) => {
			return n == 0 ? v.pos.x : n == 1 ? v.pos.z : 0;
		});

		this.updateRenderBuffers();
	}

	setReflectionTexture(tex_2D: WebGLTexture): void {
		this.renderData.textureReflection = tex_2D;
	}

	setRefractionTexture(tex_2D: WebGLTexture, tex_Cube: WebGLTexture): void {
		this.renderData.textureRefraction = tex_2D;
		this.renderData.textureRefractionCube = tex_Cube;
	}

	update(dt: number): void {}

	getNormalTexture(): WebGLTexture {
		return WaterRenderData.textureNormal;
	}

	// ---------------------- PRIVATE AREA --------------------------- //

	private config: WaterConfig;
	private renderData: WaterRenderData;
	private vertices: WaterVertex[];
	private triangles: Triangle[];

	private validateConfig(p: WaterConfig): void {
		assert(p.innerRadius > 0);
		assert(p.outerExtent > 0);
		assert(p.innerRadius > 1.0 / p.vertexDensity);
	}

	private clear(): void {
		this.vertices = null;
		this.triangles = null;
	}

	private updateRenderBuffers() {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.renderData.VBO);
		gl.bufferData(gl.ARRAY_BUFFER, AbstractVertex.arrayToBuffer(this.vertices), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const indices = new Uint16Array(3 * this.triangles.length);
		for (let i = 0; i < this.triangles.length; i++) {
			indices[i * 3 + 0] = this.triangles[i].iV1;
			indices[i * 3 + 1] = this.triangles[i].iV2;
			indices[i * 3 + 2] = this.triangles[i].iV3;
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData.IBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}
}

class WaterRenderData {
	VAO: VertexArrayObject;
	VBO: WebGLBuffer;
	IBO: WebGLBuffer;

	shaderProgram: ShaderWater;
	reloadHandler: number;

	static textureNormal: WebGLTexture;
	static textureFoam: WebGLTexture;

	textureReflection: WebGLTexture;
	textureRefractionCube: WebGLTexture;
	textureRefraction: WebGLTexture;
}

class WaterVertex extends AbstractVertex {
	pos: Vector; // 3
	fog: number; // 1

	static getStride(): number {
		return 4 * (3 + 1);
	}

	/** returns the offset of a component, in number of bytes */
	static getOffset(field: keyof WaterVertex): number {
		switch (field) {
			case "pos":
				return 4 * 0;
			case "fog":
				return 4 * 3;
			default:
				throw new Error(`Invalid field specified in WaterVertex.getOffset(): "${field}`);
		}
	}

	constructor(data: Partial<WaterVertex>) {
		super();
		Object.assign(this, data);
	}

	getStride(): number {
		return WaterVertex.getStride();
	}

	serialize(target: Float32Array, offset: number) {
		const values: number[] = [...this.pos.values(3), this.fog];
		target.set(values, offset);
	}
}
