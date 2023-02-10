import { ShaderProgramManager } from "./../../../render/shader-program-manager";
import { VertexAttribSource } from "./../../../joglr/shader-program";
import { VertexArrayObject } from "./../../../joglr/vao";
import { TextureLoader } from "./../../../joglr/texture-loader";
import { checkGLError, gl } from "./../../../joglr/glcontext";
import { ShaderWater } from "../../../render/programs/shader-water";
import { Vector } from "./../../../joglr/math/vector";
import { Triangle, triangulate } from "./triangulation";
import { IGLResource } from "../../../joglr/glresource";
import { RenderContext } from "../../../joglr/render-context";
import { Progress } from "../../../progress";
import { IRenderable } from "../../../joglr/renderable";
import { AbstractVertex } from "../../../joglr/abstract-vertex";
import { assert } from "../../../joglr/utils/assert";
import { srand } from "../../../joglr/utils/random";

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
				WaterRenderData.textureNormal_ = (
					await TextureLoader.loadFromPNG("data/textures/water/normal.png", false)
				).texture;
				gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureNormal_);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); //gl.NEAREST_MIPMAP_LINEAR);// gl.LINEAR_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				break;
			case 1:
				WaterRenderData.textureFoam_ = (
					await TextureLoader.loadFromPNG("data/textures/water/foam.png", true)
				).texture;
				gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureFoam_);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				break;
		}
		gl.bindTexture(gl.TEXTURE_2D, 0);

		return { completed: step + 1, total: 2 };
	}

	static unloadAllResources(): void {
		for (let tex of [WaterRenderData.textureFoam_, WaterRenderData.textureNormal_]) {
			gl.deleteTexture(tex);
		}
	}

	constructor() {
		this.renderData_ = new WaterRenderData();
		this.renderData_.shaderProgram_ = ShaderProgramManager.requestProgram<ShaderWater>(ShaderWater);
		this.renderData_.VAO_ = new VertexArrayObject();
		this.renderData_.VBO_ = gl.createBuffer();
		this.renderData_.IBO_ = gl.createBuffer();

		this.renderData_.reloadHandler = this.renderData_.shaderProgram_.onProgramReloaded.add(() => {
			this.setupVAO();
		});
		this.setupVAO();
	}

	setupVAO(): void {
		const mapVertexSources: Record<string, VertexAttribSource> = {
			pos: { VBO: this.renderData_.VBO_, stride: WaterVertex.getStride(), offset: WaterVertex.getOffset("pos") },
			fog: { VBO: this.renderData_.VBO_, stride: WaterVertex.getStride(), offset: WaterVertex.getOffset("fog") },
		};
		this.renderData_.shaderProgram_.setupVertexStreams(this.renderData_.VAO_, mapVertexSources);
	}

	release(): void {
		if (this.renderData_) {
			this.renderData_.shaderProgram_.onProgramReloaded.remove(this.renderData_.reloadHandler);
			this.renderData_ = null;
		}
	}

	render(context: RenderContext): void {
		if (!this.renderData_.shaderProgram_.isValid()) {
			return;
		}
		// configure backface culling
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		// set-up textures
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureNormal_);
		this.renderData_.shaderProgram_.uniforms().setWaterNormalTexSampler(0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.renderData_.textureReflection_);
		this.renderData_.shaderProgram_.uniforms().setReflectionTexSampler(1);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.renderData_.textureRefraction_);
		this.renderData_.shaderProgram_.uniforms().setRefractionTexSampler(2);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.renderData_.textureRefraction_Cube_);
		this.renderData_.shaderProgram_.uniforms().setRefractionCubeTexSampler(3);
		gl.activeTexture(gl.TEXTURE4);
		gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureFoam_);
		this.renderData_.shaderProgram_.uniforms().setFoamTexSampler(4);

		// set-up shader and vertex buffer
		this.renderData_.shaderProgram_.begin();
		this.renderData_.VAO_.bind();
		// do the drawing
		gl.drawElements(gl.TRIANGLES, this.triangles_.length * 3, gl.UNSIGNED_SHORT, 0);
		// unbind stuff
		this.renderData_.VAO_.unbind();
		this.renderData_.shaderProgram_.end();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, 0);

		gl.enable(gl.CULL_FACE);
		gl.disable(gl.BLEND);

		checkGLError("Water.render()");
	}

	generate(config: WaterConfig): void {
		this.validateConfig(config);
		this.clear();
		this.config_ = config;

		// TODO implement constrainToCircle

		const rows: number = Math.ceil(2 * config.innerRadius * config.vertexDensity) + 1;
		const cols: number = Math.ceil(2 * config.innerRadius * config.vertexDensity) + 1;

		// generate 'skirt' vertices that will surround the main water body to the outerExtent
		const extentRadius = config.innerRadius + config.outerExtent;
		const skirtVertSpacing = 30; // meters
		const nSkirtVerts = Math.floor((2 * Math.PI * extentRadius) / skirtVertSpacing);
		const skirtVertSector = (2 * Math.PI) / nSkirtVerts; // sector size between two skirt vertices
		this.nVertices_ = rows * cols + 2 * nSkirtVerts;
		this.vertices_ = new Array(this.nVertices_);

		const topleft = new Vector(-config.innerRadius, 0, -config.innerRadius);
		const dx = (config.innerRadius * 2) / (cols - 1);
		const dz = (config.innerRadius * 2) / (rows - 1);
		const wTexW = 100; // world width of water texture
		const wTexH = 100; // world height of water texture
		// compute water vertices
		for (let i = 0; i < rows; i++)
			for (let j = 0; j < cols; j++) {
				const jitter = new Vector((srand() * 0.1, srand() * 0.1));
				this.vertices_[i * rows + j] = <WaterVertex>{
					pos: topleft.add(new Vector(dx * j + jitter.x, 0, dz * i + jitter.y)), // position
					fog: 0, // fog
				};
			}
		// compute skirt vertices
		for (let i = 0; i < nSkirtVerts; i++) {
			const jitter = new Vector(srand() * 0.1, srand() * 0.1);
			let x = extentRadius * Math.cos(i * skirtVertSector) + jitter.x;
			let z = extentRadius * Math.sin(i * skirtVertSector) + jitter.y;
			this.vertices_[rows * cols + i] = <WaterVertex>{
				pos: new Vector(x, 0, z), // position
				fog: 0, //1																	// fog
			};

			x = (extentRadius + 50) * Math.cos(i * skirtVertSector) - jitter.x;
			z = (extentRadius + 50) * Math.sin(i * skirtVertSector) - jitter.y;
			this.vertices_[rows * cols + i + nSkirtVerts] = <WaterVertex>{
				pos: new Vector(x, 20, z), // position
				fog: 1, // fog
			};
		}

		this.triangles_ = triangulate(this.vertices_, (v: WaterVertex, n: number) => {
			return n == 0 ? v.pos.x : n == 1 ? v.pos.z : 0;
		});
		// TODO this might not be necessary any more
		this.fixTriangleWinding(); // after triangulation some triangles are ccw, we need to fix them

		this.updateRenderBuffers();
	}

	setReflectionTexture(tex_2D: WebGLTexture): void {
		this.renderData_.textureReflection_ = tex_2D;
	}

	setRefractionTexture(tex_2D: WebGLTexture, tex_Cube: WebGLTexture): void {
		this.renderData_.textureRefraction_ = tex_2D;
		this.renderData_.textureRefraction_Cube_ = tex_Cube;
	}

	update(dt: number): void {}

	getNormalTexture(): WebGLTexture {
		return WaterRenderData.textureNormal_;
	}

	// ---------------------- PRIVATE AREA --------------------------- //

	private config_: WaterConfig;
	private renderData_: WaterRenderData;
	private vertices_: WaterVertex[];
	private nVertices_: number;
	private triangles_: Triangle[];

	private validateConfig(p: WaterConfig): void {
		assert(p.innerRadius > 0);
		assert(p.outerExtent > 0);
		assert(p.innerRadius > 1.0 / p.vertexDensity);
	}

	private clear(): void {
		this.vertices_.splice(0);
		this.triangles_.splice(0);
	}

	private fixTriangleWinding() {
		// all triangles must be CW as seen from above
		for (const t of this.triangles_) {
			const n: Vector = this.vertices_[t.iV2].pos
				.sub(this.vertices_[t.iV1].pos)
				.cross(this.vertices_[t.iV3].pos.sub(this.vertices_[t.iV1].pos));
			if (n.y < 0) {
				// triangle is CCW, we need to reverse it
				// exchange vertices 1 and 3
				let tmp = t.iV1;
				t.iV1 = t.iV3;
				t.iV3 = tmp;
				// exchange edges 1-2 and 2-3
				// tmp = t.iN12;
				// t.iN12 = t.iN23;
				// t.iN23 = tmp;
			}
		}
	}

	private updateRenderBuffers() {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.renderData_.VBO_);
		gl.bufferData(gl.ARRAY_BUFFER, AbstractVertex.arrayToBuffer(this.vertices_), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, 0);

		const indices = new Uint16Array(3 * this.triangles_.length);
		for (let i = 0; i < this.triangles_.length; i++) {
			indices[i * 3 + 0] = this.triangles_[i].iV1;
			indices[i * 3 + 1] = this.triangles_[i].iV2;
			indices[i * 3 + 2] = this.triangles_[i].iV3;
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData_.IBO_);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, 0);
	}
}

class WaterRenderData {
	VAO_: VertexArrayObject;
	VBO_: WebGLBuffer;
	IBO_: WebGLBuffer;

	shaderProgram_: ShaderWater;
	reloadHandler: number;

	static textureNormal_: WebGLTexture;
	static textureFoam_: WebGLTexture;

	textureReflection_: WebGLTexture;
	textureRefraction_Cube_: WebGLTexture;
	textureRefraction_: WebGLTexture;
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

	getStride(): number {
		return WaterVertex.getStride();
	}

	serialize(target: Float32Array, offset: number) {
		const values: number[] = [...this.pos.values(3), this.fog];
		target.set(values, offset);
	}
}
