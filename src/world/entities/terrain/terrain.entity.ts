import { ShaderTerrainPreview } from './../../../render/programs/shader-terrain-preview';
import { ShaderProgramManager } from './../../../render/shader-program-manager';
import { VertexAttribSource } from './../../../joglr/shader-program';
import { VertexArrayObject } from './../../../joglr/vao';
import { AbstractVertex } from '../../../joglr/abstract-vertex';
import { gl } from '../../../joglr/glcontext';
import { IGLResource } from '../../../joglr/glresource';
import { Vector } from '../../../joglr/math/vector';
import { RenderContext } from '../../../joglr/render-context';
import { rand, randSeed } from "../../../joglr/utils/random";
import { Progress } from "../../../progress";
import { CustomRenderContext } from "../../../render/custom-render-context";
import { ShaderTerrain } from '../../../render/programs/shader-terrain';
import { Entity } from '../../entity';
import { IRenderable } from '../../renderable';
import { TerrainConfig } from '../config';
import { TextureLoader } from './../../../joglr/texture-loader';
import { RenderPass } from './../../../render/custom-render-context';
import { Triangle, triangulate } from "./triangulation";
import { Water, WaterConfig } from './water';
import { assert } from "../../../joglr/utils/assert";

export class Terrain extends Entity implements IRenderable, IGLResource {
	static async loadTextures(step: number): Promise<Progress> {
		switch (step) {
		case 0:
			console.log("Loading terrain textures . . .");
			TerrainRenderData.textures_[0] = new TerrainTextureInfo({
				texture: (await TextureLoader.loadFromPNG("data/textures/terrain/dirt3.png", true)).texture,
				wWidth: 2,
				wHeight: 2
			});
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[0].texture);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		break;
		case 1:
			TerrainRenderData.textures_[1] = new TerrainTextureInfo({
				texture: (await TextureLoader.loadFromPNG("data/textures/terrain/grass1.png", true)).texture,
				wWidth: 3,
				wHeight: 3
			});
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[1].texture);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		break;
		case 2:
			TerrainRenderData.textures_[2] = new TerrainTextureInfo({
				texture: (await TextureLoader.loadFromPNG("data/textures/terrain/rock1.png", true)).texture,
				wWidth: 3,
				wHeight: 3
			});
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[2].texture);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		break;
		case 3:
			TerrainRenderData.textures_[3] = new TerrainTextureInfo({
				texture: (await TextureLoader.loadFromPNG("data/textures/terrain/rock3.png", true)).texture,
				wWidth: 4,
				wHeight: 4
			});
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[3].texture);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		break;
		case 4:
			TerrainRenderData.textures_[4] = new TerrainTextureInfo({
				texture: (await TextureLoader.loadFromPNG("data/textures/terrain/sand1.png", true)).texture,
				wWidth: 4,
				wHeight: 4
			});
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[4].texture);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			console.log("Terrain textures loaded.");
		break;
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
		return {completed: step+1, total: 5};
	}
	// static unloadAllResources(): void;

	// specify previewMode=true to enable "preview" (simplified) rendering for rendering in the menu.
	constructor(private previewMode_ = false) {
		super();
		this.renderData_ = new TerrainRenderData();
		if (previewMode_) {
			this.renderData_.shaderProgram_ = ShaderProgramManager.requestProgram<ShaderTerrainPreview>(ShaderTerrainPreview);
		} else {
			this.renderData_.shaderProgram_ = ShaderProgramManager.requestProgram<ShaderTerrain>(ShaderTerrain);
		}

		this.renderData_.reloadHandler = this.renderData_.shaderProgram_.onProgramReloaded.add(() => {
			this.setupVAO();
		});
		this.setupVAO();

		if (!previewMode_)
		this.water_ = new Water();

		this.triangleAABBGenerator_ = null; // TODO new TriangleAABBGenerator(this);
	}

	setupVAO(): void {
		const mapVertexSources: Record<string, VertexAttribSource> = {
			"pos": { VBO: this.renderData_.VBO_, stride: TerrainVertex.getStride(), offset: TerrainVertex.getOffset("pos") },
			"normal": { VBO: this.renderData_.VBO_, stride: TerrainVertex.getStride(), offset: TerrainVertex.getOffset("normal") },
			"color": { VBO: this.renderData_.VBO_, stride: TerrainVertex.getStride(), offset: TerrainVertex.getOffset("color") },
			"uv1": { VBO: this.renderData_.VBO_, stride: TerrainVertex.getStride(), offset: TerrainVertex.getOffset("uv1") },
			"uv2": { VBO: this.renderData_.VBO_, stride: TerrainVertex.getStride(), offset: TerrainVertex.getOffset("uv2") },
			"uv3": { VBO: this.renderData_.VBO_, stride: TerrainVertex.getStride(), offset: TerrainVertex.getOffset("uv3") },
			"uv4": { VBO: this.renderData_.VBO_, stride: TerrainVertex.getStride(), offset: TerrainVertex.getOffset("uv4") },
			"uv5": { VBO: this.renderData_.VBO_, stride: TerrainVertex.getStride(), offset: TerrainVertex.getOffset("uv5") },
			"texBlendFactor": { VBO: this.renderData_.VBO_, stride: TerrainVertex.getStride(), offset: TerrainVertex.getOffset("texBlendFactor") }
		};
		this.renderData_.shaderProgram_.setupVertexStreams(this.renderData_.VAO_, mapVertexSources);
	}

	override destroy(): void {
		this.clear();
		this.release();
		if (this.water_)
			this.water_ = null;
		this.triangleAABBGenerator_ = null;
	}

	release(): void {
		if (this.renderData_.reloadHandler) {
			this.renderData_.shaderProgram_.onProgramReloaded.remove(this.renderData_.reloadHandler);
			this.renderData_.reloadHandler = 0;
		}
		this.renderData_.release();
		this.renderData_ = null;
		if (this.water_)
			this.water_.release();
	}

	// unsigned getEntityType() const override { return EntityTypes::TERRAIN; }

	validateSettings(c: TerrainConfig): void {
		assert(c.width > 0);
		assert(c.length > 0);
		assert(c.maxElevation > c.minElevation);
		assert(c.vertexDensity > 0);
		assert(c.width >= 1.0 / c.vertexDensity);
		assert(c.length >= 1.0 / c.vertexDensity);
	}

	// generate the terrain mesh according to specified config. This will overwrite the existing data.
	// Render buffers and Physics data structures will not be generated at this point, thus allowing the user to make modifications
	// to the terrain geometry before that.
	// Call finishGenerate() to generate these objects after you're done.
	generate(config: TerrainConfig) : void {
		console.log("[TERRAIN] Generating . . .");
		this.validateSettings(config);
		this.clear();
		this.config_ = config;

		const nextSeed = rand();
		randSeed(config.seed);

		this.rows_ = Math.ceil(config.length * config.vertexDensity) + 1;
		this.cols_ = Math.ceil(config.width * config.vertexDensity) + 1;

		// we need to generate some 'skirt' vertices that will encompass the entire terrain in a circle,
		// in order to extend the sea-bed away from the main terrain
		const terrainRadius = Math.sqrt(config.width * config.width + config.length * config.length) * 0.5;
		const seaBedRadius = terrainRadius * 2.5;
		const skirtVertSpacing = 30; // meters
		const nSkirtVerts = Math.floor((2 * Math.PI * seaBedRadius) / skirtVertSpacing);
		const skirtVertSector = 2 * Math.PI / nSkirtVerts; // sector size between two skirt vertices
		this.nVertices_ = this.rows_ * this.cols_ + nSkirtVerts;
		this.vertices_ = new Array(this.nVertices_);

		const bottomLeft = new Vector(-config.width * 0.5, 0.0, -config.length * 0.5);
		const dx = config.width / (this.cols_ - 1);
		const dz = config.length / (this.rows_ - 1);
		this.gridSpacing_ = new Vector(dx, 0, dz);
		// compute terrain vertices
		for (let i=0; i<this.rows_; i++) {
			for (let j=0; j<this.cols_; j++) {
				const jitter = new Vector(rand() * config.relativeRandomJitter * dx, rand() * config.relativeRandomJitter * dz );
				this.vertices_[i*this.cols_ + j] = <TerrainVertex>{
					pos: bottomLeft.add(new Vector(dx * j + jitter.x, config.minElevation, dz * i + jitter.y)),
					normal: new Vector(0.0, 1.0, 0.0),
					color: new Vector(1.0, 1.0, 1.0),
					uv1: new Vector(0.0, 0.0),
					uv2: new Vector(0.0, 0.0),
					uv3: new Vector(0.0, 0.0),
					uv4: new Vector(0.0, 0.0),
					uv5: new Vector(0.0, 0.0),
					texBlendFactor: new Vector(0.0, 0.0, 0.0, 0.0)
				};
				// compute UVs
				for (let t = 0; t < TerrainVertex.nTextures; t++) {
					this.vertices_[i*this.cols_ + j][`uv${t + 1}`].x = (this.vertices_[i*this.cols_ + j].pos.x - bottomLeft.x) / TerrainRenderData.textures_[t].wWidth;
					this.vertices_[i*this.cols_ + j][`uv${t + 1}`].y = (this.vertices_[i*this.cols_ + j].pos.z - bottomLeft.z) / TerrainRenderData.textures_[t].wHeight;
				}
			}
		}
		// // compute skirt vertices
		for (let i=0; i<nSkirtVerts; i++) {
			const x = seaBedRadius * Math.cos(i*skirtVertSector);
			const z = seaBedRadius * Math.sin(i*skirtVertSector);
			this.vertices_[this.rows_*this.cols_+i] = <TerrainVertex>{
				pos: new Vector(x, -30, z),
				normal: new Vector(0.0, 1.0, 0.0),
				color: new Vector(1.0, 1.0, 1.0),
				uv1: new Vector(0.0, 0.0),
				uv2: new Vector(0.0, 0.0),
				uv3: new Vector(0.0, 0.0),
				uv4: new Vector(0.0, 0.0),
				uv5: new Vector(0.0, 0.0),
				texBlendFactor: new Vector(0.0, 0.0, 0.0, 1.0)
			};
			// compute UVs
			for (let t = 0; t < TerrainVertex.nTextures; t++) {
				this.vertices_[this.rows_*this.cols_ + i][`uv${t + 1}`].x = (x - bottomLeft.x) / TerrainRenderData.textures_[t].wWidth;
				this.vertices_[this.rows_*this.cols_ + i][`uv${t + 1}`].y = (z - bottomLeft.z) / TerrainRenderData.textures_[t].wHeight;
			}
		}

		console.log("[TERRAIN] Triangulating . . .");
		this.triangles_ = triangulate(this.vertices_, (v: TerrainVertex, n: number) => {
			return n == 0 ? v.pos.x :
				   n == 1 ? v.pos.z :
				   0;
		});
		// TODO this might not be necessary any more
		this.fixTriangleWinding();	// after triangulation some triangles are ccw, we need to fix them

		console.log("[TERRAIN] Computing displacements . . .");
		this.computeDisplacements(config.seed);
		console.log("[TERRAIN] Computing normals . . .");
		this.computeNormals();
		console.log("[TERRAIN] Computing texture weights . . .");
		this.computeTextureWeights();

		console.log("[TERRAIN] Creating Binary Space Partitioning tree . . .")
		const triIndices: number[] = new Array(this.triangles_.length);
		for (let i=0; i<this.triangles_.length; i++) {
			triIndices.push(i);
		}
		// const bspConfig = new BSPConfig();
		// bspConfig.maxDepth = new Vector(100, 1, 100 );
		// bspConfig.minCellSize = new Vector(2.0, 1000.0, 2.0);
		// bspConfig.minObjects = 5;
		// bspConfig.targetVolume = <AABB>({-config_.width*0.5f, config_.minElevation - 10.0, -config_.length * 0.5f},
		// 							{+config_.width*0.5f, config_.maxElevation + 10.0, +config_.length * 0.5f});
		// bspConfig.dynamic = false;
		// this.pBSP_ = new BSPTree<unsigned>(bspConfig, triangleAABBGenerator_, std::move(triIndices));

		console.log("[TERRAIN] Generating water . . .");
		if (this.water_) {
			this.water_.generate(<WaterConfig>{
				innerRadius: terrainRadius,					// inner radius
				outerExtent: seaBedRadius - terrainRadius + 200,// outer extent
				vertexDensity: Math.max(0.05, 2.0 / terrainRadius),// vertex density
				constrainToCircle: false							// constrain to circle
			});
		}
		console.log("[TERRAIN] Done generating.");
		randSeed(nextSeed);
	}

	// Generate the render buffers and physics data structures
	finishGenerate(): void {
		console.log("[TERRAIN] Updating render and physics objects . . .");
		this.updateRenderBuffers();
		if (!this.previewMode_)
			this.updatePhysics();
	}

	// clear all terrain data
	clear(): void {
		this.vertices_ = null;
		this.nVertices_ = 0;
		this.triangles_ = null;
		// physicsBodyMeta_.reset();
		this.heightFieldValues_ = null;
		// if (this.pBSP_)
		// 	delete pBSP_, pBSP_ = nullptr;
		// TODO complete
	}

	render(context: RenderContext): void {
		if (!this.renderData_.shaderProgram_.isValid()) {
			return;
		}

		const rctx = CustomRenderContext.fromCtx(context);

		if (rctx.renderPass == RenderPass.Standard || rctx.renderPass == RenderPass.WaterReflection || rctx.renderPass == RenderPass.WaterRefraction) {
			// set-up textures
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[0].texture);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[1].texture);
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[2].texture);
			gl.activeTexture(gl.TEXTURE3);
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[3].texture);
			gl.activeTexture(gl.TEXTURE4);
			gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[4].texture);
			for (let i=0; i<TerrainVertex.nTextures; i++)
				this.renderData_.shaderProgram_.uniforms().setTextureSampler(i, i);
			if (this.water_) {
				gl.activeTexture(gl.TEXTURE5);
				gl.bindTexture(gl.TEXTURE_2D, this.water_.getNormalTexture());
				this.renderData_.shaderProgram_.uniforms().setWaterNormalTexSampler(5);
			}
			// set-up shader & vertex buffer
			this.renderData_.shaderProgram_.begin();
			this.renderData_.VAO_.bind();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData_.IBO_);
			if (rctx.enableClipPlane) {
				if (rctx.subspace < 0) {
					// draw below-water subspace:
					gl.drawElements(gl.TRIANGLES, this.renderData_.trisBelowWater_ * 3, gl.UNSIGNED_INT, 0);
				} else {
					// draw above-water subspace:
					gl.drawElements(gl.TRIANGLES, this.renderData_.trisAboveWater_ * 3, gl.UNSIGNED_INT, this.renderData_.trisBelowWater_*3*4);
				}
			} else {
				// render all in one call
				gl.drawElements(gl.TRIANGLES, (this.renderData_.trisBelowWater_ + this.renderData_.trisAboveWater_) * 3, gl.UNSIGNED_INT, 0);
			}

			// unbind stuff
			this.renderData_.VAO_.unbind();
			this.renderData_.shaderProgram_.end();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, 0);

			// draw vertex normals
			/*for (unsigned i=0; i<nVertices_; i++) {
				Shape3D::get()->drawLine(pVertices_[i].pos, pVertices_[i].pos+pVertices_[i].normal, {1.f, 0, 1.f});
			}*/
			//BSPDebugDraw::draw(*pBSP_);
			//for (unsigned i=0; i<triangles_.size() / 10; i++)
			//	Shape3D::get()->drawAABB(triangleAABBGenerator_->getAABB(i), glm::vec3{0.f, 1.f, 0.f});
		} else if (rctx.renderPass === RenderPass.WaterSurface) {
			if (this.water_)
				this.water_.render(context);
		}
	}

	update(dt: number): void {
		// TODO: implement
	}

	getHeightValue(where: Vector) { // only x and z coords are used from the input point
		// TODO: implement
	}

	getConfig(): TerrainConfig { return this.config_; }
	getHeightField(): number[] { return this.heightFieldValues_; }
	getGridSize(): Vector { return new Vector(this.cols_, this.rows_); }

	// set a 2D texture for water reflection
	setWaterReflectionTex(texId: WebGLTexture): void {
		// TODO: implement
	}
	// set a 2D texture to be used as water refraction
	setWaterRefractionTex(texId_2D: WebGLTexture, texId_Cube: WebGLTexture): void {
		// TODO: implement
	}

	getWaterNormalTexture(): WebGLTexture {
		// TODO: implement
		return null;
	}

// ------------- PRIVATE AREA --------------- //
	private rows_ = 0;
	private cols_ = 0;
	private gridSpacing_: Vector;
	private vertices_: TerrainVertex[] = null;
	private nVertices_ = 0;
	private triangles_: Triangle[] = null;
	private config_ = new TerrainConfig();
	private renderData_: TerrainRenderData = null;
	private water_: Water = null;
	private triangleAABBGenerator_ = null;
	// private BSPTree<unsigned> *pBSP_ = nullptr;

	// PhysBodyProxy physicsBodyMeta_;
	heightFieldValues_: number[] = null;

	setupBuffers(): void {
		// TODO: implement
	}

	fixTriangleWinding(): void {
		// TODO: implement
	}

	computeDisplacements(seed: number): void {
		// TODO: implement
	}

	meltEdges(xRadius: number, zRadius: number): void {
		// TODO: implement
	}

	normalizeHeights(): void {
		// TODO: implement
	}

	computeNormals(): void {
		// TODO: implement
	}

	computeTextureWeights(): void {
		// TODO: implement
	}

	updateRenderBuffers(): void {
		// TODO: implement
	}

	updatePhysics(): void {
		// TODO: implement
	}
};

class TerrainTextureInfo implements IGLResource {
	texture: WebGLTexture;	// GL texture ID
	wWidth = 1.0;			// width of texture in world units (meters)
	wHeight = 1.0;			// height/length of texture in world units (meters)

	constructor(data: Partial<TerrainTextureInfo>) {
		Object.assign(this, data);
	}

	release(): void {
		if (this.texture)
			gl.deleteTexture(this.texture);
	}
};

class TerrainVertex extends AbstractVertex {
	static readonly nTextures = 5;

	pos: Vector;	// 3
	normal: Vector;	// 3
	color: Vector;	// 3
	uv1: Vector;	// 2 uvs for each texture layer
	uv2: Vector;	// 2
	uv3: Vector;	// 2
	uv4: Vector;	// 2
	uv5: Vector;	// 2
	texBlendFactor: Vector; // 4 texture blend factors: x is between grass1 & grass2,
								//						y between rock1 & rock2
								//						z between grass/sand and rock (highest priority)
								//						w between grass and sand

	static getStride(): number {
		return 4 * (3 + 3 + 3 + 5*2 + 4);
	}

	/** returns the offset of a component, in number of floats */
	static getOffset(field: keyof TerrainVertex): number {
		switch (field) {
			case 'pos': return 4 * 0;
			case 'normal': return 4 * 3;
			case 'color': return 4 * 6;
			case 'uv1': return 4 * 9;
			case 'uv2': return 4 * 11;
			case 'uv3': return 4 * 13;
			case 'uv4': return 4 * 15;
			case 'uv5': return 4 * 17;
			case 'texBlendFactor': return 4 * 19;
			default: throw new Error(`Invalid field specified in TerrainVertex.getOffset(): "${field}`);
		}
	}

	getStride(): number {
		return TerrainVertex.getStride();
	}

	serialize(target: Float32Array, offset: number) {
		const values: number[] = [
			...this.pos.values(3),
			...this.normal.values(3),
			...this.color.values(3),
			...this.uv1.values(2),
			...this.uv2.values(2),
			...this.uv3.values(2),
			...this.uv4.values(2),
			...this.uv5.values(2),
			...this.texBlendFactor.values(4)
		];
		target.set(values, offset);
	}
};

class TerrainRenderData implements IGLResource {
	VAO_ = new VertexArrayObject();
	VBO_: WebGLBuffer = gl.createBuffer();
	IBO_: WebGLBuffer = gl.createBuffer();
	trisBelowWater_: number = 0;
	trisAboveWater_: number = 0;

	shaderProgram_: ShaderTerrain;
	reloadHandler: number;

	release(): void {
		this.VAO_.release();
		if (this.VBO_) {
			gl.deleteBuffer(this.VBO_);
			this.VBO_ = null;
		}
		if (this.IBO_) {
			gl.deleteBuffer(this.IBO_);
			this.IBO_ = null;
		}
		if (this.shaderProgram_) {
			this.shaderProgram_.release();
			this.shaderProgram_ = null;
		}
	}

	static textures_: TerrainTextureInfo[] = [];
};