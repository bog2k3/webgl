import { Water } from './water';
import { TerrainConfig } from './../config';
import { IRenderable } from '../../renderable';
import { Entity } from './../../entity';
import { RenderContext } from '../../../joglr/render-context';
import { Vector } from '../../../joglr/math/vector';
import { IGLResource } from '../../../joglr/glresource';
import { gl } from '../../../joglr/glcontext';
import { AbstractVertex } from '../../../joglr/abstract-vertex';
import { ShaderTerrain } from './terrain-shader';

type Progress = {completed: number; total: number};

export class Terrain extends Entity implements IRenderable, IGLResource {
	static loadTextures(step: number): Progress {
		return {completed: 0, total: 0};
	}
	// static unloadAllResources(): void;

	// specify previewMode=true to enable "preview" (simplified) rendering for rendering in the menu.
	constructor(previewMode = false) {
		super();
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
		const assert = (cond) => {
			if (!cond)
				throw new Error("Assertion failed");
		};
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
		console.log("Generating terrain . . .");
		this.validateSettings(config);
		this.clear();
		this.config_ = config;

		const nextSeed = new_RID();
		randSeed(config_.seed);

		this.rows_ = Math.ceil(config.length * config.vertexDensity) + 1;
		this.cols_ = Math.ceil(config.width * config.vertexDensity) + 1;

		// TODO continue here

		// we need to generate some 'skirt' vertices that will encompass the entire terrain in a circle,
		// in order to extend the sea-bed away from the main terrain
		// float terrainRadius = sqrtf(config_.width * config_.width + config_.length * config_.length) * 0.5f;
		// float seaBedRadius = terrainRadius * 2.5f;
		// float skirtVertSpacing = 30.f; // meters
		// unsigned nSkirtVerts = (2 * PI * seaBedRadius) / skirtVertSpacing;
		// float skirtVertSector = 2 * PI / nSkirtVerts; // sector size between two skirt vertices
		// nVertices_ = rows_ * cols_ + nSkirtVerts;
		// pVertices_ = (TerrainVertex*)malloc(sizeof(TerrainVertex) * nVertices_);

		// glm::vec3 bottomLeft {-config_.width * 0.5f, 0.f, -settings.length * 0.5f};
		// float dx = config_.width / (cols_ - 1);
		// float dz = config_.length / (rows_ - 1);
		// gridSpacing_ = {dx, dz};
		// // compute terrain vertices
		// for (unsigned i=0; i<rows_; i++)
		// 	for (unsigned j=0; j<cols_; j++) {
		// 		glm::vec2 jitter { randf() * config_.relativeRandomJitter * dx, randf() * config_.relativeRandomJitter * dz };
		// 		new(&pVertices_[i*cols_ + j]) TerrainVertex {
		// 			bottomLeft + glm::vec3(dx * j + jitter.x, config_.minElevation, dz * i + jitter.y),	// position
		// 			{0.f, 1.f, 0.f},																	// normal
		// 			{1.f, 1.f, 1.f},																	// color
		// 			{{0.f, 0.f}, {0.f, 0.f}, {0.f, 0.f}, {0.f, 0.f}, {0.f, 0.f}},						// uvs
		// 			{0.f, 0.f, 0.f, 0.f}																// tex blend factor
		// 		};
		// 		// compute UVs
		// 		for (unsigned t=0; t<TerrainVertex::nTextures; t++) {
		// 			pVertices_[i*cols_ + j].uv[t].x = (pVertices_[i*cols_ + j].pos.x - bottomLeft.x) / renderData_->textures_[t].wWidth;
		// 			pVertices_[i*cols_ + j].uv[t].y = (pVertices_[i*cols_ + j].pos.z - bottomLeft.z) / renderData_->textures_[t].wHeight;
		// 		}
		// 	}
		// // compute skirt vertices
		// for (unsigned i=0; i<nSkirtVerts; i++) {
		// 	float x = seaBedRadius * cosf(i*skirtVertSector);
		// 	float z = seaBedRadius * sinf(i*skirtVertSector);
		// 	new(&pVertices_[rows_*cols_+i]) TerrainVertex {
		// 		{ x, -30, z },													// position
		// 		{ 0.f, 1.f, 0.f },												// normal
		// 		{ 1.f, 1.f, 1.f },												// color
		// 		{ {0.f, 0.f}, {0.f, 0.f}, {0.f, 0.f}, {0.f, 0.f}, {0.f, 0.f} },	// uvs
		// 		{ 0.f, 0.f, 0.f, 1.f }											// tex blend factor
		// 	};
		// 	// compute UVs
		// 	for (unsigned t=0; t<TerrainVertex::nTextures; t++) {
		// 		pVertices_[rows_*cols_ + i].uv[t].x = (x - bottomLeft.x) / renderData_->textures_[t].wWidth;
		// 		pVertices_[rows_*cols_ + i].uv[t].y = (z - bottomLeft.z) / renderData_->textures_[t].wHeight;
		// 	}
		// }

		// console.log("Triangulating . . .");
		// int trRes = triangulate(pVertices_, nVertices_, triangles_);
		// if (trRes < 0) {
		// 	ERROR("Failed to triangulate terrain mesh!");
		// 	randSeed(nextSeed);
		// 	return;
		// }
		// fixTriangleWinding();	// after triangulation some triangles are ccw, we need to fix them

		// console.log("Computing displacements . . .");
		// computeDisplacements(config_.seed);
		// console.log("Computing normals . . .");
		// computeNormals();
		// console.log("Computing texture weights . . .");
		// computeTextureWeights();

		// console.log("Creating Binary Space Partitioning tree . . .")
		// std::vector<unsigned> triIndices;
		// triIndices.reserve(triangles_.size());
		// for (unsigned i=0; i<triangles_.size(); i++)
		// 	triIndices.push_back(i);
		// BSPConfig bspConfig;
		// bspConfig.maxDepth = glm::ivec3{ 100, 1, 100 };
		// bspConfig.minCellSize = glm::vec3{ 2.f, 1000.f, 2.f };
		// bspConfig.minObjects = 5;
		// bspConfig.targetVolume = AABB({-config_.width*0.5f, config_.minElevation - 10.f, -config_.length * 0.5f},
		// 							{+config_.width*0.5f, config_.maxElevation + 10.f, +config_.length * 0.5f});
		// bspConfig.dynamic = false;
		// pBSP_ = new BSPTree<unsigned>(bspConfig, triangleAABBGenerator_, std::move(triIndices));

		// console.log("Generating water . . .");
		// if (pWater_)
		// 	pWater_->generate(WaterParams {
		// 		terrainRadius,					// inner radius
		// 		seaBedRadius - terrainRadius + 200,// outer extent
		// 		max(0.05f, 2.f / terrainRadius),// vertex density
		// 		false							// constrain to circle
		// 	});
		// console.log("Done generating.");
		// randSeed(nextSeed);
	}

	// Generate the render buffers and physics data structures
	finishGenerate(): void {
		// TODO: implement
	}

	// clear all terrain data
	clear(): void {
		// TODO: implement
	}

	render(context: RenderContext): void {
		// TODO: implement
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
	private gridSpacing_ = [0, 0];
	private pVertices_: TerrainVertex[] = null;
	private nVertices_ = 0;
	private triangles_: Triangle[] = null;
	private config_ = new TerrainConfig();
	private renderData_: TerrainRenderData = null;
	private previewMode_ = false;
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
	texID: WebGLTexture;	// GL texture ID
	wWidth = 1.0;			// width of texture in world units (meters)
	wHeight = 1.0;			// height/length of texture in world units (meters)

	release(): void {
		if (this.texID)
			gl.deleteTexture(this.texID);
	}
};

class TerrainVertex extends AbstractVertex {
	static readonly nTextures = 5;

	pos: Vector;	// 3
	normal: Vector;	// 3
	color: Vector;	// 3
	uv: Vector[];	// 5*2 uvs for each texture layer
	texBlendFactor: Vector; // 4 texture blend factors: x is between grass1 & grass2,
								//						y between rock1 & rock2
								//						z between grass/sand and rock (highest priority)
								//						w between grass and sand

	static getSize(): number {
		return 4 * (3 + 3 + 3 + 5*2 + 4);
	}

	static getOffset(field: keyof TerrainVertex): number {
		switch (field) {
			case 'pos': return 4 * 0;
			case 'normal': return 4 * 3;
			case 'color': return 4 * 6;
			case 'uv': return 4 * 9;
			case 'texBlendFactor': return 4 * 19;
			default: throw new Error(`Invalid field specified in TerrainVertex.getOffset(): "${field}`);
		}
	}

	getSize(): number {
		return TerrainVertex.getSize();
	}

	serialize(target: Float32Array, offset: number) {
		const values: number[] = [
			...this.pos.values(3),
			...this.normal.values(3),
			...this.color.values(3),
			...this.uv.map(component => component.values(2)).flat(),
			...this.texBlendFactor.values(4)
		];
		target.set(values, offset);
	}
};

class TerrainRenderData implements IGLResource {
	VBO_: WebGLBuffer = null;
	IBO_: WebGLBuffer = null;
	trisBelowWater_: number = 0;
	trisAboveWater_: number = 0;

	shaderProgram_: ShaderTerrain;
	reloadHandler: number;

	release(): void {
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

	static textures_: TerrainTextureInfo[] // TerrainVertex::nTextures;
};