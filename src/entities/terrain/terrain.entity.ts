import { Heightmap, HeightmapParams } from "./heightmap";
import { ShaderTerrainPreview } from "../../render/programs/shader-terrain-preview";
import { ShaderProgramManager } from "../../render/shader-program-manager";
import { TerrainConfig } from "./config";
import { TextureInfo, TextureLoader } from "../../joglr/texture-loader";
import { CustomRenderContext, RenderPass } from "../../render/custom-render-context";
import { Triangle, triangulate } from "./triangulation";
import { Water, WaterConfig } from "./water";
import { EntityType } from "../entity-types";
import { Entity } from "../../joglr/world/entity";
import { IRenderable } from "../../joglr/render/renderable";
import { IGLResource } from "../../joglr/glresource";
import { Progress } from "../../progress";
import { checkGLError, gl } from "../../joglr/glcontext";
import { ShaderTerrain } from "../../render/programs/shader-terrain";
import { assert } from "../../joglr/utils/assert";
import { rand, randSeed } from "../../joglr/utils/random";
import { Vector } from "../../joglr/math/vector";
import { RenderContext } from "../../joglr/render/render-context";
import { AbstractVertex } from "../../joglr/render/abstract-vertex";
import { VertexAttribSource } from "../../joglr/render/shader-program";
import { VertexArrayObject } from "../../joglr/render/vao";

export class Terrain extends Entity implements IRenderable, IGLResource {
	static async loadTextures(step: number): Promise<Progress> {
		console.log("Loading terrain textures...");
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
		console.log("Terrain textures loaded.");
		return { completed: step + 1, total: 1 };
	}

	static unloadAllResources(): void {
		for (let tex of TerrainRenderData.textures_) {
			tex.release();
		}
	}

	// specify previewMode=true to enable "preview" (simplified) rendering for rendering in the menu.
	constructor(private previewMode_ = false) {
		super();
		this.renderData_ = new TerrainRenderData();
		if (previewMode_) {
			this.renderData_.shaderProgram_ =
				ShaderProgramManager.requestProgram<ShaderTerrainPreview>(ShaderTerrainPreview);
		} else {
			this.renderData_.shaderProgram_ = ShaderProgramManager.requestProgram<ShaderTerrain>(ShaderTerrain);
		}

		this.renderData_.reloadHandler = this.renderData_.shaderProgram_.onProgramReloaded.add(() => {
			this.setupVAO();
		});
		this.setupVAO();

		if (!previewMode_) this.water_ = new Water();

		this.triangleAABBGenerator_ = null; // TODO new TriangleAABBGenerator(this);
	}

	override getType(): EntityType {
		return EntityType.Terrain;
	}

	override destroy(): void {
		this.clear();
		this.release();
		if (this.water_) this.water_ = null;
		this.triangleAABBGenerator_ = null;
	}

	release(): void {
		if (this.renderData_.reloadHandler) {
			this.renderData_.shaderProgram_.onProgramReloaded.remove(this.renderData_.reloadHandler);
			this.renderData_.reloadHandler = 0;
		}
		this.renderData_.release();
		this.renderData_ = null;
		if (this.water_) this.water_.release();
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
		const skirtVertSector = (2 * Math.PI) / nSkirtVerts; // sector size between two skirt vertices
		this.nVertices_ = this.rows_ * this.cols_ + nSkirtVerts;
		this.vertices_ = new Array(this.nVertices_);

		const bottomLeft = new Vector(-config.width * 0.5, 0.0, -config.length * 0.5);
		const dx = config.width / (this.cols_ - 1);
		const dz = config.length / (this.rows_ - 1);
		this.gridSpacing_ = new Vector(dx, 0, dz);
		// compute terrain vertices
		for (let i = 0; i < this.rows_; i++) {
			for (let j = 0; j < this.cols_; j++) {
				const jitter = new Vector(
					rand() * config.relativeRandomJitter * dx,
					rand() * config.relativeRandomJitter * dz,
				);
				this.vertices_[i * this.cols_ + j] = new TerrainVertex({
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
					this.vertices_[i * this.cols_ + j][`uv${t + 1}`].x =
						(this.vertices_[i * this.cols_ + j].pos.x - bottomLeft.x) /
						TerrainRenderData.textures_[t].wWidth;
					this.vertices_[i * this.cols_ + j][`uv${t + 1}`].y =
						(this.vertices_[i * this.cols_ + j].pos.z - bottomLeft.z) /
						TerrainRenderData.textures_[t].wHeight;
				}
			}
		}
		// // compute skirt vertices
		for (let i = 0; i < nSkirtVerts; i++) {
			const x = seaBedRadius * Math.cos(i * skirtVertSector);
			const z = seaBedRadius * Math.sin(i * skirtVertSector);
			this.vertices_[this.rows_ * this.cols_ + i] = new TerrainVertex({
				pos: new Vector(x, this.config_.minElevation - 20, z),
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
				this.vertices_[this.rows_ * this.cols_ + i][`uv${t + 1}`].x =
					(x - bottomLeft.x) / TerrainRenderData.textures_[t].wWidth;
				this.vertices_[this.rows_ * this.cols_ + i][`uv${t + 1}`].y =
					(z - bottomLeft.z) / TerrainRenderData.textures_[t].wHeight;
			}
		}

		console.log("[TERRAIN] Triangulating . . .");
		this.triangles_ = triangulate(this.vertices_, (v: TerrainVertex, n: number) => {
			return n == 0 ? v.pos.x : n == 1 ? v.pos.z : 0;
		});
		// TODO this might not be necessary any more
		this.fixTriangleWinding(); // after triangulation some triangles are ccw, we need to fix them

		console.log("[TERRAIN] Computing displacements . . .");
		this.computeDisplacements(config.seed);
		console.log("[TERRAIN] Computing normals . . .");
		this.computeNormals();
		console.log("[TERRAIN] Computing texture weights . . .");
		this.computeTextureWeights();

		// TODO BSP
		// console.log("[TERRAIN] Creating Binary Space Partitioning tree . . .");
		// const triIndices: number[] = new Array(this.triangles_.length);
		// for (let i = 0; i < this.triangles_.length; i++) {
		// 	triIndices.push(i);
		// }
		// const bspConfig = new BSPConfig();
		// bspConfig.maxDepth = new Vector(100, 1, 100 );
		// bspConfig.minCellSize = new Vector(2.0, 1000.0, 2.0);
		// bspConfig.minObjects = 5;
		// bspConfig.targetVolume = <AABB>({-config_.width*0.5f, config_.minElevation - 10.0, -config_.length * 0.5f},
		// 							{+config_.width*0.5f, config_.maxElevation + 10.0, +config_.length * 0.5f});
		// bspConfig.dynamic = false;
		// this.pBSP_ = new BSPTree<unsigned>(bspConfig, triangleAABBGenerator_, std::move(triIndices));

		console.log("[TERRAIN] Generating water . . .");
		// if (this.water_) {
		// 	this.water_.generate(<WaterConfig>{
		// 		innerRadius: terrainRadius, // inner radius
		// 		outerExtent: seaBedRadius - terrainRadius + 200, // outer extent
		// 		vertexDensity: Math.max(0.05, 2.0 / terrainRadius), // vertex density
		// 		constrainToCircle: false, // constrain to circle
		// 	});
		// }
		console.log("[TERRAIN] Done generating.");
		randSeed(nextSeed);
	}

	// Generate the render buffers and physics data structures
	finishGenerate(): void {
		console.log("[TERRAIN] Updating render and physics objects . . .");
		this.updateRenderBuffers();
		if (!this.previewMode_) this.updatePhysics();
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
				this.renderData_.shaderProgram_.uniforms().setTextureSampler(i, i);
			}
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
					gl.drawElements(gl.TRIANGLES, this.renderData_.trisBelowWater_ * 3, gl.UNSIGNED_SHORT, 0);
				} else {
					// draw above-water subspace:
					gl.drawElements(
						gl.TRIANGLES,
						this.renderData_.trisAboveWater_ * 3,
						gl.UNSIGNED_SHORT,
						this.renderData_.trisBelowWater_ * 3 * 4,
					);
				}
			} else {
				// render all in one call
				gl.drawElements(
					gl.TRIANGLES,
					(this.renderData_.trisBelowWater_ + this.renderData_.trisAboveWater_) * 3,
					gl.UNSIGNED_SHORT,
					0,
				);
			}

			// unbind stuff
			this.renderData_.VAO_.unbind();
			this.renderData_.shaderProgram_.end();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, null);

			// draw vertex normals
			/*for (unsigned i=0; i<nVertices_; i++) {
				Shape3D::get()->drawLine(this.vertices_[i].pos, this.vertices_[i].pos+this.vertices_[i].normal, {1.f, 0, 1.f});
			}*/
			//BSPDebugDraw::draw(*pBSP_);
			//for (unsigned i=0; i<triangles_.length / 10; i++)
			//	Shape3D::get()->drawAABB(triangleAABBGenerator_->getAABB(i), glm::vec3{0.f, 1.f, 0.f});

			checkGLError("Terrain.render()");
		} else if (rctx.renderPass === RenderPass.WaterSurface) {
			if (this.water_) this.water_.render(context);
		}
	}

	update(dt: number): void {
		this.water_?.update(dt);
	}

	getHeightValue(where: Vector): number {
		// only x and z coords are used from the input pointer
		throw new Error("not implemented"); // TODO implement
		// auto *node = pBSP_->getNodeAtPoint(where);
		// glm::vec3 intersectionPoint;
		// glm::vec3 rayStart{where.x, config_.maxElevation + 100, where.z};
		// glm::vec3 rayDir{0.f, -1.f, 0.f};
		// for (unsigned tIndex : node->objects()) {
		// 	glm::vec3 &p1 = pVertices_[triangles_[tIndex].iV1].pos;
		// 	glm::vec3 &p2 = pVertices_[triangles_[tIndex].iV2].pos;
		// 	glm::vec3 &p3 = pVertices_[triangles_[tIndex].iV3].pos;
		// 	if (rayIntersectTri(rayStart, rayDir, p1, p2, p3, intersectionPoint))
		// 		return intersectionPoint.y;
		// }
		// return config_.minElevation;	// no triangles exist at the given location
	}

	getConfig(): TerrainConfig {
		return this.config_;
	}
	getHeightField(): number[] {
		return this.heightFieldValues_;
	}
	getGridSize(): Vector {
		return new Vector(this.cols_, this.rows_);
	}

	// set a 2D texture for water reflection
	setWaterReflectionTex(texture: WebGLTexture): void {
		this.water_?.setReflectionTexture(texture);
	}
	// set a 2D texture to be used as water refraction
	setWaterRefractionTex(texture_2D: WebGLTexture, texId_Cube: WebGLTexture): void {
		this.water_?.setRefractionTexture(texture_2D, texId_Cube);
	}

	getWaterNormalTexture(): WebGLTexture {
		return this.water_?.getNormalTexture() ?? null;
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

	private fixTriangleWinding(): void {
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

	private computeDisplacements(seed: number): void {
		const hparam = new HeightmapParams();
		hparam.width = Math.floor(this.config_.width / 2);
		hparam.length = Math.floor(this.config_.length / 2);
		hparam.minHeight = this.config_.minElevation;
		hparam.maxHeight = this.config_.maxElevation;
		// reset seed so we always compute the same displacement regardless of how many vertices we have
		randSeed(seed);
		const height = new Heightmap(hparam);
		height.blur(2);
		// reset seed so we always compute the same displacement regardless of how many vertices we have
		randSeed(seed);
		// PerlinNoise roughNoise(max(4.f, this.config_.width), max(4.f, this.config_.length));
		// TODO perlin noise

		const bottomLeft = new Vector(-this.config_.width * 0.5, 0, -this.config_.length * 0.5);
		for (
			let i = 1;
			i < this.rows_ - 1;
			i++ // we leave the edge vertices at zero to avoid artifacts with the skirt
		)
			for (let j = 1; j < this.cols_ - 1; j++) {
				const k = i * this.cols_ + j;
				const u = (this.vertices_[k].pos.x - bottomLeft.x) / this.config_.width;
				const v = (this.vertices_[k].pos.z - bottomLeft.z) / this.config_.length;

				// const roughness = (
				// 	+ roughNoise.getNorm(u/32, v/32, 1.f) * 1.f
				// 	+ roughNoise.getNorm(u/16, v/16, 1.f) * 0.5f
				// 	+ roughNoise.getNorm(u/8, v/8, 1.f) * 0.25f
				// 	+ roughNoise.getNorm(u/4, v/4, 1.f) * 0.125f
				// 	+ roughNoise.getNorm(u/2, v/2, 1.f) * 0.0625f
				// 	+ roughNoise.getNorm(u, v, 1.f) * 0.03125f
				// 	+ roughNoise.getNorm(u*2, v*2, 1.f) * 0.015625f
				// 	+ roughNoise.getNorm(u*4, v*4, 1.f) * 0.0078125f
				// 	+ roughNoise.getNorm(u*8, v*8, 1.f) * 0.00390625f
				// 	) * 20 - 10;

				this.vertices_[k].pos.y = height.value(u, v);
				// this.vertices_[k].pos.y += roughness * this.config_.roughness;

				// TODO : use vertex colors with perlin noise for more variety

				// debug
				//float hr = (pVertices_[k].pos.y - this.config_.minElevation) / (this.config_.maxElevation - this.config_.minElevation);
				//pVertices_[k].color = {1.f - hr, hr, 0};
			}
		this.meltEdges(this.cols_ * 0.2, this.rows_ * 0.2);
		this.normalizeHeights();
	}

	private meltEdges(xRadius: number, zRadius: number): void {
		// if (xRadius > cols_/2 || zRadius > rows_/2) {
		// 	ERROR("Terrain::meltEdges() received invalid parameter");
		// 	return;
		// }
		// auto slopeFn = [](float x) {
		// 	return 0.5f + 0.5f * sinf(x * PI - PI/2);
		// };
		// for (unsigned i=0; i<rows_; i++)
		// 	for (unsigned j=0; j<cols_; j++) {
		// 		float row_edgeFactor = clamp(1.5f - 3 * abs((int)i - (int)rows_/2) / (float)rows_, 0.f, 1.f);
		// 		float col_edgeFactor = clamp(1.5f - 3 * abs((int)j - (int)cols_/2) / (float)cols_, 0.f, 1.f);
		// 		float edgeFactor = sqrt(row_edgeFactor * col_edgeFactor);
		// 		float edgeScaleFactor = slopeFn(clamp(edgeFactor, 0.f, 1.f));
		// 		pVertices_[i*cols_+j].pos.y = lerp(config_.minElevation, pVertices_[i*cols_+j].pos.y, edgeScaleFactor);
		// 	}
		// return;
		// // top edge:
		// for (unsigned i=0; i<zRadius; i++) {
		// 	float f = (float)i / zRadius;
		// 	f = slopeFn(f);
		// 	for (unsigned j=0; j<cols_; j++)
		// 		pVertices_[i*cols_+j].pos.y = lerp(config_.minElevation, pVertices_[i*cols_+j].pos.y, f);
		// }
		// // bottom edge:
		// for (unsigned i=rows_-zRadius; i<rows_; i++) {
		// 	float f = (float)(rows_-i) / zRadius;
		// 	f = slopeFn(f);
		// 	for (unsigned j=0; j<cols_; j++)
		// 		pVertices_[i*cols_+j].pos.y = lerp(config_.minElevation, pVertices_[i*cols_+j].pos.y, f);
		// }
		// // left edge:
		// for (unsigned j=0; j<xRadius; j++) {
		// 	float f = (float)j / xRadius;
		// 	f = slopeFn(f);
		// 	for (unsigned i=0; i<rows_; i++)
		// 		pVertices_[i*cols_+j].pos.y = lerp(config_.minElevation, pVertices_[i*cols_+j].pos.y, f);
		// }
		// // right edge:
		// for (unsigned j=cols_-xRadius; j<cols_; j++) {
		// 	float f = (float)(cols_-j) / xRadius;
		// 	f = slopeFn(f);
		// 	for (unsigned i=0; i<rows_; i++)
		// 		pVertices_[i*cols_+j].pos.y = lerp(config_.minElevation, pVertices_[i*cols_+j].pos.y, f);
		// }
	}

	private normalizeHeights(): void {
		// // adjust the heights to bring them to fill the entire [minElevation, maxElevation] range
		// // 1: compute min/max:
		// float vmin = 1e20f, vmax = -1e20f;
		// for (unsigned i=0; i<rows_*cols_; i++) {
		// 	if (pVertices_[i].pos.y < vmin)
		// 		vmin = pVertices_[i].pos.y;
		// 	if (pVertices_[i].pos.y > vmax)
		// 		vmax = pVertices_[i].pos.y;
		// }
		// // 2: rescale the values to fill the entire height range
		// float scale = (config_.maxElevation - config_.minElevation) / (vmax - vmin);
		// for (unsigned i=0; i<rows_*cols_; i++) {
		// 	int row = i / cols_;
		// 	int col = i % cols_;
		// 	pVertices_[i].pos.y = config_.minElevation + (pVertices_[i].pos.y - vmin) * scale;
		// }
	}

	private computeNormals(): void {
		// for (auto &t : triangles_) {
		// 	glm::vec3 n = glm::cross(pVertices_[t.iV2].pos - pVertices_[t.iV1].pos, pVertices_[t.iV3].pos - pVertices_[t.iV1].pos);
		// 	n = glm::normalize(n);
		// 	pVertices_[t.iV1].normal += n;
		// 	pVertices_[t.iV2].normal += n;
		// 	pVertices_[t.iV3].normal += n;
		// }
		// for (unsigned i=0; i<nVertices_; i++) {
		// 	if ((i/cols_) == 0 || (i/cols_) == rows_-1 || (i%cols_) == 0 || (i%cols_) == cols_-1)
		// 		pVertices_[i].normal = glm::vec3{0.f, 1.f, 0.f};  // we leave the edge vertices at zero to avoid artifacts with the skirt
		// 	else
		// 		pVertices_[i].normal = glm::normalize(pVertices_[i].normal);
		// }
	}

	private computeTextureWeights(): void {
		// PerlinNoise pnoise(config_.width/2, config_.length/2);
		// glm::vec3 bottomLeft {-config_.width * 0.5f, 0.f, -config_.length * 0.5f};
		// const float grassBias = 0.2f; // bias to more grass over dirt
		// for (unsigned i=0; i<rows_*cols_; i++) {
		// 	// grass/rock factor is determined by slope
		// 	// each one of grass and rock have two components blended together by a perlin factor for low-freq variance
		// 	float u = (pVertices_[i].pos.x - bottomLeft.x) / config_.width;
		// 	float v = (pVertices_[i].pos.z - bottomLeft.z) / config_.length;
		// 	// #1 Grass vs Dirt factor
		// 	pVertices_[i].texBlendFactor.x = grassBias
		// 										+ pnoise.getNorm(u*0.15, v*0.15, 7.f)
		// 										+ 0.3f * pnoise.get(u*0.3, v*0.3, 7.f)
		// 										+ 0.1 * pnoise.get(u*0.6, v*0.6, 2.f);	// dirt / grass
		// 	// #2 Rock1 vs Rock2 factor
		// 	pVertices_[i].texBlendFactor.y = pnoise.getNorm(v*0.15, u*0.15, 7.f) + 0.5 * pnoise.get(v*0.6, u*0.6, 2.f);	// rock1 / rock2
		// 	// #3 Rock vs Grass/Sand factor (highest priority)
		// 	float cutoffY = 0.80f;	// y-component of normal above which grass is used instead of rock
		// 	if (pVertices_[i].pos.y > 0) {
		// 		// above water grass-rock coefficient
		// 		// height factor for grass vs rock: the higher the vertex, the more likely it is to be rock
		// 		float hFactor = clamp(pVertices_[i].pos.y / config_.maxElevation, 0.f, 1.f); // hFactor is 1.0 at the highest elevation, 0.0 at sea level.
		// 		hFactor = pow(hFactor, 1.5f);
		// 		cutoffY += (1.0 - cutoffY) * hFactor;
		// 		pVertices_[i].texBlendFactor.z = pVertices_[i].normal.y > cutoffY ? 1.f : 0.f; // grass vs rock
		// 	} else {
		// 		// this is below water
		// 		if (u <= 0.01 || v <= 0.01 || u >= 0.99 || v >= 0.99) {
		// 			// edges are always sand
		// 			pVertices_[i].texBlendFactor.z = 1.f;
		// 		} else {
		// 			if (pVertices_[i].normal.y > cutoffY + 0.1f) {
		// 				// below water rock coefficient based on perlin noise
		// 				float noise = pnoise.get(u*0.15, v*0.15, 7.f)
		// 							+ 0.3 * pnoise.get(u*0.6, v*0.6, 7.f)
		// 							+ 0.1 * pnoise.get(u*1.0, v*1.0, 7.f);
		// 				float sandBias = 0.4f * pVertices_[i].normal.y; // flat areas are more likely to be sand rather than rock
		// 				pVertices_[i].texBlendFactor.z = noise + sandBias > 0 ? 1.f : 0.25f;
		// 			} else
		// 				pVertices_[i].texBlendFactor.z = 0.2f; // steep underwater areas are still rock
		// 		}
		// 	}
		// 	// #4 Grass vs Sand factor -> some distance above water level and everything below is sand or rock
		// 	float beachHeight = 1.f + 1.5f * pnoise.getNorm(u*1.5, v*1.5, 1.f); // meters
		// 	if (pVertices_[i].pos.y < beachHeight) {
		// 		float sandFactor = min(1.f, beachHeight - pVertices_[i].pos.y);
		// 		pVertices_[i].texBlendFactor.w = pow(sandFactor, 1.5f);
		// 	} else
		// 		pVertices_[i].texBlendFactor.w = 0;
		// }
	}

	private updateRenderBuffers(): void {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.renderData_.VBO_);
		gl.bufferData(gl.ARRAY_BUFFER, AbstractVertex.arrayToBuffer(this.vertices_), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const waterLevelTolerance = 0.01;
		const indices = new Uint16Array(6 * this.triangles_.length); // alocate double the number of triangle points to make sure we don't overflow
		this.renderData_.trisBelowWater_ = 0;
		// first loop: indices for tris below water
		for (let i = 0; i < this.triangles_.length; i++) {
			// decide if triangle is at least partially submerged:
			if (
				this.vertices_[this.triangles_[i].iV1].pos.y >= waterLevelTolerance &&
				this.vertices_[this.triangles_[i].iV2].pos.y >= waterLevelTolerance &&
				this.vertices_[this.triangles_[i].iV3].pos.y >= waterLevelTolerance
			) {
				continue;
			}
			indices[this.renderData_.trisBelowWater_ * 3 + 0] = this.triangles_[i].iV1;
			indices[this.renderData_.trisBelowWater_ * 3 + 1] = this.triangles_[i].iV2;
			indices[this.renderData_.trisBelowWater_ * 3 + 2] = this.triangles_[i].iV3;
			this.renderData_.trisBelowWater_++;
		}
		// second loop: indices for tris above water
		this.renderData_.trisAboveWater_ = 0;
		const offset = this.renderData_.trisBelowWater_ * 3;
		for (let i = 0; i < this.triangles_.length; i++) {
			// check if the triangle is at least partially above water
			if (
				this.vertices_[this.triangles_[i].iV1].pos.y <= -waterLevelTolerance &&
				this.vertices_[this.triangles_[i].iV2].pos.y <= -waterLevelTolerance &&
				this.vertices_[this.triangles_[i].iV3].pos.y <= -waterLevelTolerance
			) {
				continue;
			}
			indices[offset + this.renderData_.trisAboveWater_ * 3 + 0] = this.triangles_[i].iV1;
			indices[offset + this.renderData_.trisAboveWater_ * 3 + 1] = this.triangles_[i].iV2;
			indices[offset + this.renderData_.trisAboveWater_ * 3 + 2] = this.triangles_[i].iV3;
			this.renderData_.trisAboveWater_++;
		}
		assert(this.renderData_.trisBelowWater_ + this.renderData_.trisAboveWater_ >= this.triangles_.length);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderData_.IBO_);
		const totalIndices: number = (this.renderData_.trisBelowWater_ + this.renderData_.trisAboveWater_) * 3;
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW, 0, totalIndices);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	private updatePhysics(): void {
		// // create array of height values:
		// if (heightFieldValues_)
		// 	free(heightFieldValues_), heightFieldValues_ = nullptr;
		// unsigned hfRows = (unsigned)ceil(config_.length);
		// unsigned hfCols = (unsigned)ceil(config_.width);
		// heightFieldValues_ = (float*)malloc(sizeof(float) * hfRows * hfCols);
		// glm::vec3 bottomLeft {-config_.width * 0.5f, 0.f, -config_.length * 0.5f};
		// float dx = config_.width / (hfCols - 1);
		// float dz = config_.length / (hfRows - 1);
		// const float heightOffset = 0.1f;	// offset physics geometry slightly higher
		// for (unsigned i=0; i<hfRows; i++)
		// 	for (unsigned j=0; j<hfCols; j++)
		// 		heightFieldValues_[i*hfCols+j] = getHeightValue(bottomLeft + glm::vec3{j*dx, 0, i*dz}) + heightOffset;
		// // create ground body
		// physicsBodyMeta_.reset();
		// PhysBodyConfig bodyCfg;
		// bodyCfg.position = glm::vec3{0.f, (config_.maxElevation + config_.minElevation)*0.5f, 0.f};
		// bodyCfg.mass = 0.f;
		// bodyCfg.friction = 0.5f;
		// bodyCfg.shape = std::make_shared<btHeightfieldTerrainShape>(hfCols, hfRows, heightFieldValues_, 1.f,
		// 						config_.minElevation, config_.maxElevation, 1, PHY_FLOAT, false);
		// physicsBodyMeta_.createBody(bodyCfg);
	}

	private setupVAO(): void {
		const mapVertexSources: Record<string, VertexAttribSource> = {
			pos: {
				VBO: this.renderData_.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("pos"),
			},
			normal: {
				VBO: this.renderData_.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("normal"),
			},
			color: {
				VBO: this.renderData_.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("color"),
			},
			uv1: {
				VBO: this.renderData_.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv1"),
			},
			uv2: {
				VBO: this.renderData_.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv2"),
			},
			uv3: {
				VBO: this.renderData_.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv3"),
			},
			uv4: {
				VBO: this.renderData_.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv4"),
			},
			uv5: {
				VBO: this.renderData_.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("uv5"),
			},
			texBlendFactor: {
				VBO: this.renderData_.VBO_,
				stride: TerrainVertex.getStride(),
				offset: TerrainVertex.getOffset("texBlendFactor"),
			},
		};
		this.renderData_.shaderProgram_.setupVertexStreams(this.renderData_.VAO_, mapVertexSources);
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
