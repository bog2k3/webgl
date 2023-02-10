import { Water, WaterParams } from './water';
import { TerrainConfig } from './../config';
import { IRenderable } from '../../renderable';
import { Entity } from './../../entity';
import { RenderContext } from '../../../joglr/render-context';
import { Vector } from '../../../joglr/math/vector';
import { IGLResource } from '../../../joglr/glresource';
import { gl } from '../../../joglr/glcontext';
import { AbstractVertex } from '../../../joglr/abstract-vertex';
import { ShaderTerrain } from './terrain-shader';
import { rand, randSeed } from "../../../joglr/utils/random";
import { Triangle, triangulate } from "./triangulation";

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

		const nextSeed = rand();
		randSeed(config.seed);

		this.rows_ = Math.ceil(config.length * config.vertexDensity) + 1;
		this.cols_ = Math.ceil(config.width * config.vertexDensity) + 1;

		// TODO continue here

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
				const jitter = new Vector(Math.random() * config.relativeRandomJitter * dx, Math.random() * config.relativeRandomJitter * dz );
				this.vertices_[i*this.cols_ + j] = <TerrainVertex>{
					pos: bottomLeft.add(new Vector(dx * j + jitter.x, config.minElevation, dz * i + jitter.y)),	// position
					normal: new Vector(0.0, 1.0, 0.0),											// normal
					color: new Vector(1.0, 1.0, 1.0),											// color
					uv: [																		// uvs
						new Vector(0.0, 0.0), new Vector(0.0, 0.0),
						new Vector(0.0, 0.0), new Vector(0.0, 0.0), new Vector(0.0, 0.0)
					],
					texBlendFactor: new Vector(0.0, 0.0, 0.0, 0.0)								// tex blend factor
				};
				// compute UVs
				for (let t=0; t<TerrainVertex.nTextures; t++) {
					this.vertices_[i*this.cols_ + j].uv[t].x = (this.vertices_[i*this.cols_ + j].pos.x - bottomLeft.x) / TerrainRenderData.textures_[t].wWidth;
					this.vertices_[i*this.cols_ + j].uv[t].y = (this.vertices_[i*this.cols_ + j].pos.z - bottomLeft.z) / TerrainRenderData.textures_[t].wHeight;
				}
			}
		}
		// // compute skirt vertices
		for (let i=0; i<nSkirtVerts; i++) {
			const x = seaBedRadius * Math.cos(i*skirtVertSector);
			const z = seaBedRadius * Math.sin(i*skirtVertSector);
			this.vertices_[this.rows_*this.cols_+i] = <TerrainVertex>{
				pos: new Vector(x, -30, z),										// position
				normal: new Vector(0.0, 1.0, 0.0),								// normal
				color: new Vector(1.0, 1.0, 1.0),								// color
				uv: [															// uvs
					new Vector(0.0, 0.0), new Vector(0.0, 0.0),
					new Vector(0.0, 0.0), new Vector(0.0, 0.0), new Vector(0.0, 0.0)
				],
				texBlendFactor: new Vector(0.0, 0.0, 0.0, 1.0)					// tex blend factor
			};
			// compute UVs
			for (let t=0; t<TerrainVertex.nTextures; t++) {
				this.vertices_[this.rows_*this.cols_ + i].uv[t].x = (x - bottomLeft.x) / TerrainRenderData.textures_[t].wWidth;
				this.vertices_[this.rows_*this.cols_ + i].uv[t].y = (z - bottomLeft.z) / TerrainRenderData.textures_[t].wHeight;
			}
		}

		console.log("Triangulating . . .");
		this.triangles_ = triangulate(this.vertices_, (v: TerrainVertex, n: number) => {
			return n == 0 ? v.pos.x :
				   n == 1 ? v.pos.z :
				   0;
		});
		// TODO this might not be necessary any more
		this.fixTriangleWinding();	// after triangulation some triangles are ccw, we need to fix them

		console.log("Computing displacements . . .");
		this.computeDisplacements(config.seed);
		console.log("Computing normals . . .");
		this.computeNormals();
		console.log("Computing texture weights . . .");
		this.computeTextureWeights();

		console.log("Creating Binary Space Partitioning tree . . .")
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

		console.log("Generating water . . .");
		if (this.water_) {
			this.water_.generate(<WaterParams>{
				innerRadius: terrainRadius,					// inner radius
				outerExtent: seaBedRadius - terrainRadius + 200,// outer extent
				vertexDensity: Math.max(0.05, 2.0 / terrainRadius),// vertex density
				constrainToCircle: false							// constrain to circle
			});
		}
		console.log("Done generating.");
		randSeed(nextSeed);
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
	private gridSpacing_: Vector;
	private vertices_: TerrainVertex[] = null;
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