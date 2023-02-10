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

export class Terrain extends Entity implements IRenderable {
	static loadTextures(step: number): Progress {
		return {completed: 0, total: 0};
	}
	// static unloadAllResources(): void;

	// specify previewMode=true to enable "preview" (simplified) rendering for rendering in the menu.
	constructor(previewMode=false) {
		super();
	}

	override destroy(): void {
		// TODO: implement
	}

	// unsigned getEntityType() const override { return EntityTypes::TERRAIN; }

	// generate the terrain mesh according to specified config. This will overwrite the existing data.
	// Render buffers and Physics data structures will not be generated at this point, thus allowing the user to make modifications
	// to the terrain geometry before that.
	// Call finishGenerate() to generate these objects after you're done.
	generate(config: TerrainConfig) : void {
		// TODO: implement
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
	private renderData_: RenderData = null;
	private previewMode_ = false;
	// private pWater_: Water = null;
	// private triangleAABBGenerator_ = nullptr;
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
	static const nTextures = 5;

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

class TerrainRenderData {
	VBO_: WebGLBuffer = null;
	IBO_: WebGLBuffer = null;
	trisBelowWater_: number = 0;
	trisAboveWater_: number = 0;

	shaderProgram_: ShaderTerrain;
	reloadHandler: number;

	static textures_: TerrainTextureInfo[] // TerrainVertex::nTextures;
};