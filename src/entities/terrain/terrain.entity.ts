import { Heightmap, HeightmapParams } from "./heightmap";
import { ShaderTerrainPreview } from "../../render/programs/shader-terrain-preview";
import { ShaderProgramManager } from "../../render/shader-program-manager";
import { TerrainConfig } from "./config";
import { TextureInfo, TextureLoader } from "../../joglfw/texture-loader";
import { CustomRenderContext, RenderPass } from "../../render/custom-render-context";
import { Triangle, triangulate } from "./triangulation";
import { Water, WaterConfig } from "./water";
import { EntityTypes } from "../entity-types";
import { Entity } from "../../joglfw/world/entity";
import { IRenderable } from "../../joglfw/render/renderable";
import { IGLResource } from "../../joglfw/glresource";
import { Progress } from "../../progress";
import { checkGLError, gl } from "../../joglfw/glcontext";
import { ShaderTerrain } from "../../render/programs/shader-terrain";
import { assert } from "../../joglfw/utils/assert";
import { rand, randSeed } from "../../joglfw/utils/random";
import { Vector } from "../../joglfw/math/vector";
import { RenderContext } from "../../joglfw/render/render-context";
import { AbstractVertex } from "../../joglfw/render/abstract-vertex";
import { VertexAttribSource } from "../../joglfw/render/shader-program";
import { VertexArrayObject } from "../../joglfw/render/vao";
import { logprefix } from "../../joglfw/log";
import { clamp, lerp } from "../../joglfw/math/functions";
import { PerlinNoise } from "./perlin-noise";
import { BSPConfig, BSPNode, BSPTree, AABBGeneratorInterface } from "../../bsp/bsp-tree";
import { AABB } from "../../joglfw/math/aabb";
import { rayIntersectTri } from "../../joglfw/math/intersect";
import { PhysBodyProxy, PhysBodyConfig } from "../../physics/phys-body-proxy";
import Ammo from "ammojs-typed";

const console = logprefix("Terrain");

export class Terrain extends Entity implements IRenderable, IGLResource {
	static async loadTextures(step: number): Promise<Progress> {
		console.log("Loading textures...");
		const textureInfo = [
			{
				url: "data/textures/terrain/dirt3.png",
				wWidth: 2,
				wHeight: 2,
			},
			{
				url: "data/textures/terrain/grass1.png",
				wWidth: 3,
				wHeight: 3,
			},
			{
				url: "data/textures/terrain/rock1.png",
				wWidth: 3,
				wHeight: 3,
			},
			{
				url: "data/textures/terrain/rock3.png",
				wWidth: 4,
				wHeight: 4,
			},
			{
				url: "data/textures/terrain/sand1.png",
				wWidth: 4,
				wHeight: 4,
			},
		];
		await Promise.all(
			textureInfo.map((tInfo, index) =>
				TextureLoader.loadFromPNG(tInfo.url, true).then((result: TextureInfo) => {
					TerrainRenderData.textures_[index] = new TerrainTextureInfo({
						texture: result.texture,
						wWidth: tInfo.wWidth,
						wHeight: tInfo.wHeight,
					});
					gl.bindTexture(gl.TEXTURE_2D, TerrainRenderData.textures_[index].texture);
					gl.generateMipmap(gl.TEXTURE_2D);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				}),
			),
		);
		gl.bindTexture(gl.TEXTURE_2D, null);
		console.log("Textures loaded.");
		return { completed: step + 1, total: 1 };
	}

	static unloadAllResources(): void {
		for (let tex of TerrainRenderData.textures_) {
			tex.release();
		}
	}

	/** specify previewMode=true to enable "preview" (simplified) rendering for rendering in the menu. */
	constructor(options: { previewMode: boolean }) {
		super();
		this.renderData = new TerrainRenderData();
		this.previewMode = options.previewMode;
		if (this.previewMode) {
			this.renderData.shaderProgram_ =
				ShaderProgramManager.requestProgram<ShaderTerrainPreview>(ShaderTerrainPreview);
		} else {
			this.renderData.shaderProgram_ = ShaderProgramManager.requestProgram<ShaderTerrain>(ShaderTerrain);
		}

		this.renderData.reloadHandler = this.renderData.shaderProgram_.onProgramReloaded.add(() => {
			this.setupVAO();
		});
		this.setupVAO();

		// if (!this.previewMode) this.water = new Water();
	}

	override getType(): string {
		return EntityTypes.Terrain;
	}

	override destroy(): void {
		this.clear();
		this.release();
		if (this.water) this.water = null;
	}

	release(): void {
		if (this.renderData.reloadHandler) {
			this.renderData.shaderProgram_.onProgramReloaded.remove(this.renderData.reloadHandler);
			this.renderData.reloadHandler = 0;
		}
		this.renderData.release();
		this.renderData = null;
		if (this.water) this.water.release();
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
	generate(config: TerrainConfig): void {
		console.log("Generating . . .");
		this.validateSettings(config);
		this.clear();
		this.config = config;

		const nextSeed = rand();
		randSeed(config.seed);

		this.rows = Math.ceil(config.length * config.vertexDensity) + 1;
		this.cols = Math.ceil(config.width * config.vertexDensity) + 1;

		// we need to generate some 'skirt' vertices that will encompass the entire terrain in a circle,
		// in order to extend the sea-bed away from the main terrain
		const terrainRadius = Math.sqrt(config.width * config.width + config.length * config.length) * 0.5;
		const seaBedRadius = terrainRadius * 2.5;
		const skirtVertSpacing = 30; // meters
		const nSkirtVerts = Math.floor((2 * Math.PI * seaBedRadius) / skirtVertSpacing);
		const skirtVertSector = (2 * Math.PI) / nSkirtVerts; // sector size between two skirt vertices
		this.nVertices = this.rows * this.cols + nSkirtVerts;
		this.vertices = new Array(this.nVertices);

		const bottomLeft = new Vector(-config.width * 0.5, 0.0, -config.length * 0.5);
		const dx = config.width / (this.cols - 1);
		const dz = config.length / (this.rows - 1);
		this.gridSpacing = new Vector(dx, 0, dz);
		// compute terrain vertices
		for (let i = 0; i < this.rows; i++) {
			for (let j = 0; j < this.cols; j++) {
				const jitter = new Vector(
					rand() * config.relativeRandomJitter * dx,
					rand() * config.relativeRandomJitter * dz,
				);
				this.vertices[i * this.cols + j] = new TerrainVertex({
					pos: bottomLeft.add(new Vector(dx * j + jitter.x, config.minElevation, dz * i + jitter.y)),
					normal: new Vector(0.0, 1.0, 0.0),
					color: new Vector(1.0, 1.0, 1.0),
					uv1: new Vector(0.0, 0.0),
					uv2: new Vector(0.0, 0.0),
					uv3: new Vector(0.0, 0.0),
					uv4: new Vector(0.0, 0.0),
					uv5: new Vector(0.0, 0.0),
					texBlendFactor: new Vector(0.0, 0.0, 0.0, 0.0),
				});
				// compute UVs
				for (let t = 0; t < TerrainVertex.nTextures; t++) {
					this.vertices[i * this.cols + j][`uv${t + 1}`].x =
						(this.vertices[i * this.cols + j].pos.x - bottomLeft.x) / TerrainRenderData.textures_[t].wWidth;
					this.vertices[i * this.cols + j][`uv${t + 1}`].y =
						(this.vertices[i * this.cols + j].pos.z - bottomLeft.z) /
						TerrainRenderData.textures_[t].wHeight;
				}
			}
		}
		// // compute skirt vertices
		for (let i = 0; i < nSkirtVerts; i++) {
			const x = seaBedRadius * Math.cos(i * skirtVertSector);
			const z = seaBedRadius * Math.sin(i * skirtVertSector);
			this.vertices[this.rows * this.cols + i] = new TerrainVertex({
				pos: new Vector(x, this.config.minElevation - 20, z),
				normal: new Vector(0.0, 1.0, 0.0),
				color: new Vector(1.0, 1.0, 1.0),
				uv1: new Vector(0.0, 0.0),
				uv2: new Vector(0.0, 0.0),
				uv3: new Vector(0.0, 0.0),
				uv4: new Vector(0.0, 0.0),
				uv5: new Vector(0.0, 0.0),
				texBlendFactor: new Vector(0.0, 0.0, 0.0, 1.0),
			});
			// compute UVs
			for (let t = 0; t < TerrainVertex.nTextures; t++) {
				this.vertices[this.rows * this.cols + i][`uv${t + 1}`].x =
					(x - bottomLeft.x) / TerrainRenderData.textures_[t].wWidth;
				this.vertices[this.rows * this.cols + i][`uv${t + 1}`].y =
					(z - bottomLeft.z) / TerrainRenderData.textures_[t].wHeight;
			}
		}

		console.log("Triangulating . . .");
		this.triangles = triangulate(this.vertices, (v: TerrainVertex, n: number) => {
			return n == 0 ? v.pos.x : n == 1 ? v.pos.z : 0;
		});

		console.log("Computing displacements . . .");
		this.computeDisplacements(config.seed);
		console.log("Computing normals . . .");
		this.computeNormals();
		console.log("Computing texture weights . . .");
		this.computeTextureWeights();

		console.log("Creating Binary Space Partitioning tree . . .");
		const triIndices: number[] = new Array(this.triangles.length);
		for (let i = 0; i < this.triangles.length; i++) {
			triIndices[i] = i;
		}
		const bspConfig = new BSPConfig({
			maxDepth: new Vector(100, 1, 100),
			minCellSize: new Vector(2.0, 1000.0, 2.0),
			minObjects: 5,
			targetVolume: new AABB(
				new Vector(-this.config.width * 0.5, this.config.minElevation - 10.0, -this.config.length * 0.5),
				new Vector(+this.config.width * 0.5, this.config.maxElevation + 10.0, +this.config.length * 0.5),
			),
			dynamic: false,
		});
		this.bspTree = new BSPTree<number>(bspConfig, this.triangleAABBGenerator, triIndices);

		console.log("Generating water . . .");
		// if (this.water_) {
		// 	this.water_.generate(<WaterConfig>{
		// 		innerRadius: terrainRadius, // inner radius
		// 		outerExtent: seaBedRadius - terrainRadius + 200, // outer extent
		// 		vertexDensity: Math.max(0.05, 2.0 / terrainRadius), // vertex density
		// 		constrainToCircle: false, // constrain to circle
		// 	});
		// }
		console.log("Done generating.");
		randSeed(nextSeed);
	}

	// Generate the render buffers and physics data structures
	finishGenerate(): void {
		console.log("Updating render and physics objects . . .");
		this.updateRenderBuffers();
		if (!this.previewMode) this.updatePhysics();
		console.log("Complete.");
	}

	// clear all terrain data
	clear(): void {
		this.vertices = null;
		this.nVertices = 0;
		this.triangles = null;
		if (this.physicsBodyMeta) {
			this.physicsBodyMeta.destroy();
			this.physicsBodyMeta = null;
		}
		this.heightFieldValues = null;
		this.bspTree = null;
	}

	render(context: RenderContext): void {
		if (!this.renderData.shaderProgram_.isValid()) {
			return;
		}

		const rctx = CustomRenderContext.fromCtx(context);

		if (
			rctx.renderPass == RenderPass.Standard ||
			rctx.renderPass == RenderPass.WaterReflection ||
			rctx.renderPass == RenderPass.WaterRefraction
		) {
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
			for (let i = 0; i < TerrainVertex.nTextures; i++) {
				this.renderData.shaderProgram_.uniforms().setTextureSampler(i, i);
			}
			if (this.water) {
				gl.activeTexture(gl.TEXTURE5);
				gl.bindTexture(gl.TEXTURE_2D, this.water.getNormalTexture());
				this.renderData.shaderProgram_.uniforms().setWaterNormalTexSampler(5);
			}
			// set-up shader & vertex buffer
			this.renderData.shaderProgram_.begin();
			this.renderData.VAO_.bind();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData.IBO_);
			if (rctx.enableClipPlane) {
				if (rctx.subspace < 0) {
					// draw below-water subspace:
					gl.drawElements(gl.TRIANGLES, this.renderData.trisBelowWater_ * 3, gl.UNSIGNED_SHORT, 0);
				} else {
					// draw above-water subspace:
					gl.drawElements(
						gl.TRIANGLES,
						this.renderData.trisAboveWater_ * 3,
						gl.UNSIGNED_SHORT,
						this.renderData.trisBelowWater_ * 3 * 4,
					);
				}
			} else {
				// render all in one call
				gl.drawElements(
					gl.TRIANGLES,
					(this.renderData.trisBelowWater_ + this.renderData.trisAboveWater_) * 3,
					gl.UNSIGNED_SHORT,
					0,
				);
			}

			// unbind stuff
			this.renderData.VAO_.unbind();
			this.renderData.shaderProgram_.end();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, null);

			// draw vertex normals
			/*for (unsigned i=0; i<nVertices_; i++) {
				Shape3D::get()->drawLine(this.vertices_[i].pos, this.vertices_[i].pos+this.vertices_[i].normal, {1.f, 0, 1.f});
			}*/
			//BSPDebugDraw::draw(*bspTree);
			//for (unsigned i=0; i<triangles_.length / 10; i++)
			//	Shape3D::get()->drawAABB(triangleAABBGenerator_->getAABB(i), glm::vec3{0, 1.f, 0});

			checkGLError("Terrain.render()");
		} else if (rctx.renderPass === RenderPass.WaterSurface) {
			if (this.water) this.water.render(context);
		}
	}

	update(dt: number): void {
		this.water?.update(dt);
	}

	getHeightValue(where: Vector): number {
		// only x and z coords are used from the input vector
		const node: BSPNode<number> = this.bspTree.getNodeAtPoint(where);
		let intersectionPoint: Vector;
		const rayStart = new Vector(where.x, this.config.maxElevation + 100, where.z);
		const rayDir = new Vector(0, 1, 0);
		for (let triIndex of node.objects) {
			const p1: Vector = this.vertices[this.triangles[triIndex].iV1].pos;
			const p2: Vector = this.vertices[this.triangles[triIndex].iV2].pos;
			const p3: Vector = this.vertices[this.triangles[triIndex].iV3].pos;
			const intersectionPoint: Vector | null = rayIntersectTri(rayStart, rayDir, p1, p2, p3);
			if (intersectionPoint) {
				return intersectionPoint.y;
			}
		}
		return this.config.minElevation; // no triangles exist at the given location
	}

	getConfig(): TerrainConfig {
		return this.config;
	}
	getHeightField(): number[] {
		return this.heightFieldValues;
	}
	getGridSize(): Vector {
		return new Vector(this.cols, this.rows);
	}

	// set a 2D texture for water reflection
	setWaterReflectionTex(texture: WebGLTexture): void {
		this.water?.setReflectionTexture(texture);
	}
	// set a 2D texture to be used as water refraction
	setWaterRefractionTex(texture_2D: WebGLTexture, texId_Cube: WebGLTexture): void {
		this.water?.setRefractionTexture(texture_2D, texId_Cube);
	}

	getWaterNormalTexture(): WebGLTexture {
		return this.water?.getNormalTexture() ?? null;
	}

	// ------------- PRIVATE AREA --------------- //

	private previewMode: boolean;
	private rows = 0;
	private cols = 0;
	private gridSpacing: Vector;
	private vertices: TerrainVertex[] = null;
	private nVertices = 0;
	private triangles: Triangle[] = null;
	private config = new TerrainConfig();
	private renderData: TerrainRenderData = null;
	private water: Water = null;
	private triangleAABBGenerator = new TriangleAABBGenerator(this);
	private bspTree: BSPTree<number> = null;

	private physicsBodyMeta: PhysBodyProxy;
	heightFieldValues: number[] = null;

	private computeDisplacements(seed: number): void {
		const hparam = new HeightmapParams();
		hparam.width = Math.floor(this.config.width / 2);
		hparam.length = Math.floor(this.config.length / 2);
		hparam.minHeight = this.config.minElevation;
		hparam.maxHeight = this.config.maxElevation;
		// reset seed so we always compute the same displacement regardless of how many vertices we have
		randSeed(seed);
		const height = new Heightmap(hparam);
		height.blur(2);
		// reset seed so we always compute the same displacement regardless of how many vertices we have
		randSeed(seed);
		const roughNoise = new PerlinNoise(Math.max(4, this.config.width), Math.max(4, this.config.length));

		const bottomLeft = new Vector(-this.config.width * 0.5, 0, -this.config.length * 0.5);
		for (
			let i = 1;
			i < this.rows - 1;
			i++ // we leave the edge vertices at zero to avoid artifacts with the skirt
		)
			for (let j = 1; j < this.cols - 1; j++) {
				const k = i * this.cols + j;
				const u = (this.vertices[k].pos.x - bottomLeft.x) / this.config.width;
				const v = (this.vertices[k].pos.z - bottomLeft.z) / this.config.length;

				// prettier-ignore
				const roughness = (
					roughNoise.getNorm(u / 32, v / 32, 1.0) * 1 +
					roughNoise.getNorm(u / 16, v / 16, 1.0) * 0.5 +
					roughNoise.getNorm(u / 8, v / 8, 1.0) * 0.25 +
					roughNoise.getNorm(u / 4, v / 4, 1.0) * 0.125 +
					roughNoise.getNorm(u / 2, v / 2, 1.0) * 0.0625 +
					roughNoise.getNorm(u, v, 1.0) * 0.03125 +
					roughNoise.getNorm(u * 2, v * 2, 1.0) * 0.015625 +
					roughNoise.getNorm(u * 4, v * 4, 1.0) * 0.0078125 +
					roughNoise.getNorm(u * 8, v * 8, 1.0) * 0.00390625
				) * 10 - 10;

				this.vertices[k].pos.y = height.value(u, v);
				this.vertices[k].pos.y += roughness * this.config.roughness;

				// TODO : use vertex colors with perlin noise for more variety

				// debug
				//float hr = (this.vertices_[k].pos.y - this.config_.minElevation) / (this.config_.maxElevation - this.config_.minElevation);
				//this.vertices_[k].color = {1.f - hr, hr, 0};
			}
		this.normalizeHeights();
		this.meltEdges(this.cols * 0.2, this.rows * 0.2);
	}

	private meltEdges(xRadius: number, zRadius: number): void {
		if (xRadius > this.cols / 2 || zRadius > this.rows / 2) {
			throw new Error("Terrain::meltEdges() received invalid parameter");
		}
		const slopeFn = (x: number) => 0.5 + 0.5 * Math.sin(x * Math.PI - Math.PI / 2);
		for (let i = 0; i < this.rows; i++) {
			for (let j = 0; j < this.cols; j++) {
				const row_edgeFactor = clamp(1.5 - (3 * Math.abs(i - Math.floor(this.rows / 2))) / this.rows, 0, 1);
				const col_edgeFactor = clamp(1.5 - (3 * Math.abs(j - Math.floor(this.cols / 2))) / this.cols, 0, 1);
				const edgeFactor = Math.sqrt(row_edgeFactor * col_edgeFactor);
				const edgeScaleFactor = slopeFn(clamp(edgeFactor, 0, 1));
				this.vertices[i * this.cols + j].pos.y = lerp(
					this.config.minElevation,
					this.vertices[i * this.cols + j].pos.y,
					edgeScaleFactor,
				);
			}
		}
	}

	private normalizeHeights(): void {
		// adjust the heights to bring them to fill the entire [minElevation, maxElevation] range
		// 1: compute min/max:
		let vmin = 1e20;
		let vmax = -1e20;
		for (let i = 0; i < this.rows * this.cols; i++) {
			if (this.vertices[i].pos.y < vmin) vmin = this.vertices[i].pos.y;
			if (this.vertices[i].pos.y > vmax) vmax = this.vertices[i].pos.y;
		}
		// 2: rescale the values to fill the entire height range
		const scale = (this.config.maxElevation - this.config.minElevation) / (vmax - vmin);
		for (let i = 0; i < this.rows * this.cols; i++) {
			const row = Math.floor(i / this.cols);
			const col = i % this.cols;
			this.vertices[i].pos.y = this.config.minElevation + (this.vertices[i].pos.y - vmin) * scale;
		}
	}

	private computeNormals(): void {
		for (const t of this.triangles) {
			const n = this.vertices[t.iV2].pos
				.sub(this.vertices[t.iV1].pos)
				.cross(this.vertices[t.iV3].pos.sub(this.vertices[t.iV1].pos))
				.normalize();
			this.vertices[t.iV1].normal.addInPlace(n);
			this.vertices[t.iV2].normal.addInPlace(n);
			this.vertices[t.iV3].normal.addInPlace(n);
		}
		for (let i = 0; i < this.nVertices; i++) {
			if (
				Math.floor(i / this.cols) == 0 ||
				Math.floor(i / this.cols) == this.rows - 1 ||
				i % this.cols == 0 ||
				i % this.cols == this.cols - 1
			) {
				this.vertices[i].normal = new Vector(0, 1, 0); // we leave the edge vertices at zero to avoid artifacts with the skirt
			} else {
				this.vertices[i].normal.normalizeInPlace();
			}
		}
	}

	private computeTextureWeights(): void {
		const pnoise = new PerlinNoise(this.config.width / 2, this.config.length / 2);
		const bottomLeft = new Vector(-this.config.width * 0.5, 0, -this.config.length * 0.5);
		const grassBias = 0.2; // bias to more grass over dirt
		for (let i = 0; i < this.rows * this.cols; i++) {
			// grass/rock factor is determined by slope
			// each one of grass and rock have two components blended together by a perlin factor for low-freq variance
			const u: number = (this.vertices[i].pos.x - bottomLeft.x) / this.config.width;
			const v: number = (this.vertices[i].pos.z - bottomLeft.z) / this.config.length;
			// #1 Grass vs Dirt factor
			this.vertices[i].texBlendFactor.x =
				grassBias +
				pnoise.getNorm(u * 0.15, v * 0.15, 7) +
				0.3 * pnoise.get(u * 0.3, v * 0.3, 7) +
				0.1 * pnoise.get(u * 0.6, v * 0.6, 2); // dirt / grass
			// #2 Rock1 vs Rock2 factor
			this.vertices[i].texBlendFactor.y =
				pnoise.getNorm(v * 0.15, u * 0.15, 7) + 0.5 * pnoise.get(v * 0.6, u * 0.6, 2); // rock1 / rock2
			// #3 Rock vs Grass/Sand factor (highest priority)
			let cutoffY = 0.8; // y-component of normal above which grass is used instead of rock
			if (this.vertices[i].pos.y > 0) {
				// above water grass-rock coefficient
				// height factor for grass vs rock: the higher the vertex, the more likely it is to be rock
				let hFactor: number = clamp(this.vertices[i].pos.y / this.config.maxElevation, 0, 1); // hFactor is 1.0 at the highest elevation, 0.0 at sea level.
				hFactor = Math.pow(hFactor, 1.5);
				cutoffY += (1.0 - cutoffY) * hFactor;
				this.vertices[i].texBlendFactor.z = this.vertices[i].normal.y > cutoffY ? 1 : 0; // grass vs rock
			} else {
				// this is below water
				if (u <= 0.01 || v <= 0.01 || u >= 0.99 || v >= 0.99) {
					// edges are always sand
					this.vertices[i].texBlendFactor.z = 1;
				} else {
					if (this.vertices[i].normal.y > cutoffY + 0.1) {
						// below water rock coefficient based on perlin noise
						const noise =
							pnoise.get(u * 0.15, v * 0.15, 7) +
							0.3 * pnoise.get(u * 0.6, v * 0.6, 7) +
							0.1 * pnoise.get(u * 1.0, v * 1.0, 7);
						const sandBias = 0.4 * this.vertices[i].normal.y; // flat areas are more likely to be sand rather than rock
						this.vertices[i].texBlendFactor.z = noise + sandBias > 0 ? 1 : 0.25;
					} else {
						this.vertices[i].texBlendFactor.z = 0.2; // steep underwater areas are still rock
					}
				}
			}
			// #4 Grass vs Sand factor -> some distance above water level and everything below is sand or rock
			const beachHeight = 1 + 1.5 * pnoise.getNorm(u * 1.5, v * 1.5, 1); // meters
			if (this.vertices[i].pos.y < beachHeight) {
				const sandFactor = Math.min(1, beachHeight - this.vertices[i].pos.y);
				this.vertices[i].texBlendFactor.w = Math.pow(sandFactor, 1.5);
			} else {
				this.vertices[i].texBlendFactor.w = 0;
			}
		}
	}

	private updateRenderBuffers(): void {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.renderData.VBO_);
		gl.bufferData(gl.ARRAY_BUFFER, AbstractVertex.arrayToBuffer(this.vertices), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const waterLevelTolerance = 0.01;
		const indices = new Uint16Array(6 * this.triangles.length); // alocate double the number of triangle points to make sure we don't overflow
		this.renderData.trisBelowWater_ = 0;
		// first loop: indices for tris below water
		for (let i = 0; i < this.triangles.length; i++) {
			// decide if triangle is at least partially submerged:
			if (
				this.vertices[this.triangles[i].iV1].pos.y >= waterLevelTolerance &&
				this.vertices[this.triangles[i].iV2].pos.y >= waterLevelTolerance &&
				this.vertices[this.triangles[i].iV3].pos.y >= waterLevelTolerance
			) {
				continue;
			}
			indices[this.renderData.trisBelowWater_ * 3 + 0] = this.triangles[i].iV1;
			indices[this.renderData.trisBelowWater_ * 3 + 1] = this.triangles[i].iV2;
			indices[this.renderData.trisBelowWater_ * 3 + 2] = this.triangles[i].iV3;
			this.renderData.trisBelowWater_++;
		}
		// second loop: indices for tris above water
		this.renderData.trisAboveWater_ = 0;
		const offset = this.renderData.trisBelowWater_ * 3;
		for (let i = 0; i < this.triangles.length; i++) {
			// check if the triangle is at least partially above water
			if (
				this.vertices[this.triangles[i].iV1].pos.y <= -waterLevelTolerance &&
				this.vertices[this.triangles[i].iV2].pos.y <= -waterLevelTolerance &&
				this.vertices[this.triangles[i].iV3].pos.y <= -waterLevelTolerance
			) {
				continue;
			}
			indices[offset + this.renderData.trisAboveWater_ * 3 + 0] = this.triangles[i].iV1;
			indices[offset + this.renderData.trisAboveWater_ * 3 + 1] = this.triangles[i].iV2;
			indices[offset + this.renderData.trisAboveWater_ * 3 + 2] = this.triangles[i].iV3;
			this.renderData.trisAboveWater_++;
		}
		assert(this.renderData.trisBelowWater_ + this.renderData.trisAboveWater_ >= this.triangles.length);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData.IBO_);
		const totalIndices: number = (this.renderData.trisBelowWater_ + this.renderData.trisAboveWater_) * 3;
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW, 0, totalIndices);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	private updatePhysics(): void {
		// create array of height values:
		if (this.heightFieldValues) {
			this.heightFieldValues = null;
		}
		const hfRows: number = Math.ceil(this.config.length);
		const hfCols: number = Math.ceil(this.config.width);
		this.heightFieldValues = new Array(hfRows * hfCols);
		const bottomLeft = new Vector(-this.config.width * 0.5, 0, -this.config.length * 0.5);
		const dx: number = this.config.width / (hfCols - 1);
		const dz: number = this.config.length / (hfRows - 1);
		const heightOffset = 0.1; // offset physics geometry slightly higher
		for (let i = 0; i < hfRows; i++) {
			for (let j = 0; j < hfCols; j++) {
				this.heightFieldValues[i * hfCols + j] =
					this.getHeightValue(bottomLeft.add(new Vector(j * dx, 0, i * dz))) + heightOffset;
			}
		}
		// create ground body
		if (this.physicsBodyMeta) {
			this.physicsBodyMeta.destroy();
		} else {
			this.physicsBodyMeta = new PhysBodyProxy(this);
		}
		const bodyCfg = new PhysBodyConfig();
		bodyCfg.position = new Vector(0, (this.config.maxElevation + this.config.minElevation) * 0.5, 0);
		bodyCfg.mass = 0;
		bodyCfg.friction = 0.5;
		bodyCfg.shape = new Ammo.btHeightfieldTerrainShape(
			hfCols,
			hfRows,
			this.heightFieldValues,
			1,
			this.config.minElevation,
			this.config.maxElevation,
			1,
			"PHY_FLOAT",
			false,
		);
		this.physicsBodyMeta.createBody(bodyCfg);
	}

	private setupVAO(): void {
		const mapVertexSources: Record<string, VertexAttribSource> = {
			pos: {
				VBO: this.renderData.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("pos"),
			},
			normal: {
				VBO: this.renderData.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("normal"),
			},
			color: {
				VBO: this.renderData.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("color"),
			},
			uv1: {
				VBO: this.renderData.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv1"),
			},
			uv2: {
				VBO: this.renderData.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv2"),
			},
			uv3: {
				VBO: this.renderData.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv3"),
			},
			uv4: {
				VBO: this.renderData.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv4"),
			},
			uv5: {
				VBO: this.renderData.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv5"),
			},
			texBlendFactor: {
				VBO: this.renderData.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("texBlendFactor"),
			},
		};
		this.renderData.shaderProgram_.setupVertexStreams(this.renderData.VAO_, mapVertexSources);
	}
}

class TerrainTextureInfo implements IGLResource {
	texture: WebGLTexture; // GL texture ID
	wWidth = 1.0; // width of texture in world units (meters)
	wHeight = 1.0; // height/length of texture in world units (meters)

	constructor(data: Partial<TerrainTextureInfo>) {
		Object.assign(this, data);
	}

	release(): void {
		if (this.texture) gl.deleteTexture(this.texture);
	}
}

class TerrainVertex extends AbstractVertex {
	static readonly nTextures = 5;

	pos = new Vector(); // 3
	normal = new Vector(); // 3
	color = new Vector(); // 3
	uv1 = new Vector(); // 2 uvs for each texture layer
	uv2 = new Vector(); // 2
	uv3 = new Vector(); // 2
	uv4 = new Vector(); // 2
	uv5 = new Vector(); // 2
	texBlendFactor = new Vector(); // 4 texture blend factors: x is between grass1 & grass2,
	//						y between rock1 & rock2
	//						z between grass/sand and rock (highest priority)
	//						w between grass and sand

	static getStride(): number {
		return 4 * (3 + 3 + 3 + 5 * 2 + 4);
	}

	/** returns the offset of a component, in number of bytes */
	static getOffset(field: keyof TerrainVertex): number {
		switch (field) {
			case "pos":
				return 4 * 0;
			case "normal":
				return 4 * 3;
			case "color":
				return 4 * 6;
			case "uv1":
				return 4 * 9;
			case "uv2":
				return 4 * 11;
			case "uv3":
				return 4 * 13;
			case "uv4":
				return 4 * 15;
			case "uv5":
				return 4 * 17;
			case "texBlendFactor":
				return 4 * 19;
			default:
				throw new Error(`Invalid field specified in TerrainVertex.getOffset(): "${field}`);
		}
	}

	constructor(data: Partial<TerrainVertex>) {
		super();
		Object.assign(this, data);
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
			...this.texBlendFactor.values(4),
		];
		target.set(values, offset);
	}
}

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
}

class TriangleAABBGenerator implements AABBGeneratorInterface<number> {
	constructor(private readonly terrain: Terrain) {}

	private cache: { [index: number]: AABB } = {};

	getAABB(i: number): AABB {
		if (!this.cache[i]) {
			// compute the AABB for terrain triangle at index i;
			const p1: Vector = this.terrain["vertices"][this.terrain["triangles"][i].iV1].pos;
			const p2: Vector = this.terrain["vertices"][this.terrain["triangles"][i].iV2].pos;
			const p3: Vector = this.terrain["vertices"][this.terrain["triangles"][i].iV3].pos;
			this.cache[i] = new AABB();
			this.cache[i].expandInPlace(p1, p2, p3);
		}
		return this.cache[i];
	}
	// TODO we should probably clear this after finishing
}
