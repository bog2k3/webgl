import { Terrain } from "../entities/terrain/terrain.entity";
import { Water } from "../entities/terrain/water";
import { checkGLError } from "../joglfw/glcontext";
import { Vector } from "../joglfw/math/vector";
import { Mesh } from "../joglfw/mesh";
import { MeshRenderer } from "../joglfw/render/mesh-renderer";
import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { ShapeRenderer } from "../joglfw/render/shape-renderer";
import { assert } from "../joglfw/utils/assert";
import { Entity } from "../joglfw/world/entity";
import { World } from "../joglfw/world/world";
import { physWorld } from "../physics/physics";
import { gl } from "../joglfw/glcontext";
import { RenderPass } from "./custom-render-context";
import { ShaderSkybox } from "./programs/shader-skybox";
import { ShaderTerrain } from "./programs/shader-terrain";
import { ShaderTerrainPreview } from "./programs/shader-terrain-preview";
import { ShaderWater } from "./programs/shader-water";
import { SharedUniformPacks } from "./programs/shared-uniform-packs";
import { PostProcessData, RenderData } from "./render-data";
import { ShaderProgramManager } from "./shader-program-manager";

const WATER_FRAMEBUFFER_REDUCTION = 2; // how much smaller the water offscreen framebuffers are than the main framebuffer

export async function initRender(renderData: RenderData): Promise<boolean> {
	SharedUniformPacks.initialize();
	renderData.setupDependencies();

	// configure backface culling
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CW);
	gl.cullFace(gl.BACK);

	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);
	gl.disable(gl.BLEND);

	// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);

	// set up post processing hook
	// TODO implement
	// if (initPostProcessData(renderData.windowW, renderData.windowH, renderData.postProcessData)) {
	// 	const multisamples = 4; // >0 for MSSAA, 0 to disable
	// 	setPostProcessHook(PostProcessStep::POST_DOWNSAMPLING, std::bind(renderPostProcess, std::ref(renderData)), multisamples);
	// }

	// set up water refraction framebuffer
	renderData.waterRenderData.refractionFBDesc.width = Math.floor(renderData.windowW / WATER_FRAMEBUFFER_REDUCTION);
	renderData.waterRenderData.refractionFBDesc.height = Math.floor(renderData.windowH / WATER_FRAMEBUFFER_REDUCTION);
	renderData.waterRenderData.refractionFBDesc.format = gl.RGBA;
	renderData.waterRenderData.refractionFBDesc.multisamples = 0;
	renderData.waterRenderData.refractionFBDesc.requireDepthBuffer = true;
	if (!renderData.waterRenderData.refractionFramebuffer.create(renderData.waterRenderData.refractionFBDesc))
		return false;
	gl.bindTexture(gl.TEXTURE_2D, renderData.waterRenderData.refractionFramebuffer.fbTexture());
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.bindTexture(gl.TEXTURE_2D, null);

	// set up water reflection framebuffer
	renderData.waterRenderData.reflectionFBDesc.width = Math.floor(renderData.windowW / WATER_FRAMEBUFFER_REDUCTION);
	renderData.waterRenderData.reflectionFBDesc.height = Math.floor(renderData.windowH / WATER_FRAMEBUFFER_REDUCTION);
	renderData.waterRenderData.reflectionFBDesc.format = gl.RGBA;
	renderData.waterRenderData.reflectionFBDesc.multisamples = 0;
	renderData.waterRenderData.reflectionFBDesc.requireDepthBuffer = true;
	if (!renderData.waterRenderData.reflectionFramebuffer.create(renderData.waterRenderData.reflectionFBDesc))
		return false;
	gl.bindTexture(gl.TEXTURE_2D, renderData.waterRenderData.reflectionFramebuffer.fbTexture());
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.bindTexture(gl.TEXTURE_2D, null);

	// set up viewport and camera
	renderData.viewport.setBkColor(new Vector(0, 0, 0));
	renderData.viewport.camera().setFOV(Math.PI / 2.5);
	renderData.viewport.camera().setZPlanes(0.3, 1500);
	renderData.viewport.camera().moveTo(new Vector(0, 0, -1));

	Mesh.ENABLE_COLOR_DEBUG = true;
	// prettier-ignore
	await Promise.all([
		MeshRenderer.initialize(),
		ShapeRenderer.initialize(),
		loadShaders(),
		loadTextures()
	]);

	// done
	return true;
}

function loadShaders(): Promise<void> {
	return Promise.all([
		ShaderProgramManager.loadProgram(ShaderTerrainPreview),
		ShaderProgramManager.loadProgram(ShaderTerrain),
		ShaderProgramManager.loadProgram(ShaderSkybox),
		ShaderProgramManager.loadProgram(ShaderWater),
	]).then();
}

function loadTextures(): Promise<void> {
	// prettier-ignore
	return Promise.all([
		Terrain.loadTextures(0),
		Water.loadTextures(0)
	]).then();
}

export function unloadRender(renderData: RenderData): void {
	deletePostProcessData(renderData.postProcessData);
	renderData.waterRenderData.reflectionFramebuffer.release();
	renderData.waterRenderData.refractionFramebuffer.release();
	renderData.release();
	// RenderHelpers::unload();
	Terrain.unloadAllResources();
	Water.unloadAllResources();
}

export function resetRenderSize(renderData: RenderData, newWidth: number, newHeight: number): void {
	renderData.windowW = newWidth;
	renderData.windowH = newHeight;
	renderData.viewport.setArea(0, 0, newWidth, newHeight);
	renderData.waterRenderData.reflectionFBDesc.width = Math.floor(newWidth / WATER_FRAMEBUFFER_REDUCTION);
	renderData.waterRenderData.reflectionFBDesc.height = Math.floor(newHeight / WATER_FRAMEBUFFER_REDUCTION);
	renderData.waterRenderData.reflectionFramebuffer.reset(renderData.waterRenderData.reflectionFBDesc);
	renderData.waterRenderData.refractionFBDesc.width = Math.floor(newWidth / WATER_FRAMEBUFFER_REDUCTION);
	renderData.waterRenderData.refractionFBDesc.height = Math.floor(newHeight / WATER_FRAMEBUFFER_REDUCTION);
	renderData.waterRenderData.refractionFramebuffer.reset(renderData.waterRenderData.refractionFBDesc);
}

export function render3D(renderData: RenderData, world: World): void {
	renderData.defaultFrameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
	if (renderData.renderCtx.enableWaterRender) {
		renderData.renderCtx.cameraUnderwater = renderData.viewport.camera().position().y < 0;

		const underDraw: IRenderable[] = [];
		const underEntities: Entity[] = world.getEntities([], { renderable: true });
		// append all drawable entities from world:
		// TODO - use a BSP or something to only get entities under water level
		for (let e of underEntities) {
			if (e === renderData.skyBox) continue;
			underDraw.push(e as unknown as IRenderable);
		}

		const aboveDraw: IRenderable[] = [];
		const aboveEntities: Entity[] = world.getEntities([], { renderable: true });
		// append all drawable entities from world:
		// TODO - use a BSP or something to only get entities above water level
		for (let e of aboveEntities) aboveDraw.push(e as unknown as IRenderable);

		checkGLError("render() setup");

		// 1st pass - reflection
		setupRenderPass(renderData, RenderPass.WaterReflection);
		renderList(renderData.renderCtx.cameraUnderwater ? underDraw : aboveDraw, renderData.renderCtx);
		resetRenderPass(renderData, RenderPass.WaterReflection);
		checkGLError("render() pass #1");

		// 2nd pass - refraction
		setupRenderPass(renderData, RenderPass.WaterRefraction);
		renderList(renderData.renderCtx.cameraUnderwater ? aboveDraw : underDraw, renderData.renderCtx);
		resetRenderPass(renderData, RenderPass.WaterRefraction);
		checkGLError("render() pass #2");

		// 3rd pass - standard rendering of scene
		setupRenderPass(renderData, RenderPass.Standard);
		renderList(renderData.renderCtx.cameraUnderwater ? underDraw : aboveDraw, renderData.renderCtx);
		resetRenderPass(renderData, RenderPass.Standard);
		checkGLError("render() pass #3");
	} else {
		renderData.renderCtx.cameraUnderwater = false;
		renderData.viewport.clear();
		// no water, just render everything in one pass:
		setupRenderPass(renderData, RenderPass.Standard);
		renderList([world], renderData.renderCtx);
		resetRenderPass(renderData, RenderPass.Standard);
	}

	// final pass - physics debug draw and shapes
	if (renderData.config.renderPhysicsDebug) {
		physWorld.debugDrawWorld();
	}
	ShapeRenderer.get().renderAll(renderData.renderCtx);

	checkGLError("render() pass #3");

	// 4th pass - water surface
	if (renderData.renderCtx.enableWaterRender) {
		assert(renderData.terrain !== null, "terrain pointer not set!");
		setupRenderPass(renderData, RenderPass.WaterSurface);
		renderList([renderData.terrain], renderData.renderCtx);
		resetRenderPass(renderData, RenderPass.WaterSurface);

		checkGLError("render() pass #4");
	}

	// 2D UI will be rendered after post processing

	checkGLError("render() final");
	gl.flush();
}

function setupRenderPass(renderData: RenderData, pass: RenderPass) {
	renderData.renderCtx.renderPass = pass;
	renderData.renderCtx.enableWireframe = renderData.config.renderWireFrame;
	if (renderData.config.renderWireFrame) {
		throw new Error("wireframe rendering not implemented");
		// gl.polygonMode(gl.FRONT_AND_BACK, gl.LINE);
		// gl.lineWidth(2.0);
	} else {
		// glPolygonMode(gl.FRONT_AND_BACK, gl.FILL);
	}

	const waterDepthFactor = Math.pow(1.0 / (Math.max(0, -renderData.viewport.camera().position().y) + 1), 0.5);

	switch (renderData.renderCtx.renderPass) {
		case RenderPass.WaterReflection:
			renderData.waterRenderData.reflectionFramebuffer.bind();
			renderData.viewport.setArea(
				0,
				0,
				renderData.waterRenderData.reflectionFBDesc.width,
				renderData.waterRenderData.reflectionFBDesc.height,
			);
			renderData.viewport.activate();
			renderData.viewport.setBkColor(renderData.waterRenderData.waterColor.scale(waterDepthFactor));
			renderData.viewport.clear();
			renderData.renderCtx.subspace = renderData.renderCtx.cameraUnderwater ? -1.0 : +1.0;
			renderData.renderCtx.enableClipPlane = true;
			renderData.viewport.camera().mirror(new Vector(0, renderData.renderCtx.subspace, 0, 0));
			break;

		case RenderPass.WaterRefraction:
			renderData.waterRenderData.refractionFramebuffer.bind();
			renderData.viewport.setArea(
				0,
				0,
				renderData.waterRenderData.refractionFBDesc.width,
				renderData.waterRenderData.refractionFBDesc.height,
			);
			renderData.viewport.activate();
			renderData.viewport.setBkColor(new Vector(0.07, 0.16, 0.2, 1.0)); // TODO hardcoded value
			renderData.viewport.clear();
			renderData.renderCtx.subspace = renderData.renderCtx.cameraUnderwater ? +1.0 : -1.0;
			renderData.renderCtx.enableClipPlane = true;
			break;

		case RenderPass.Standard:
			renderData.renderCtx.subspace = renderData.renderCtx.cameraUnderwater ? -1.0 : +1.0;
			renderData.renderCtx.enableClipPlane = renderData.renderCtx.enableWaterRender;
			if (renderData.renderCtx.cameraUnderwater) {
				renderData.viewport.setBkColor(renderData.waterRenderData.waterColor.scale(waterDepthFactor));
			}
			renderData.viewport.activate();
			renderData.viewport.clear();
			break;

		case RenderPass.WaterSurface:
			break;

		case RenderPass.UI:
			gl.disable(gl.DEPTH_TEST);
			if (renderData.config.renderWireFrame) {
				throw new Error("wireframe rendering not implemented");
				// gl.polygonMode(gl.FRONT_AND_BACK, gl.FILL);
				// gl.lineWidth(1.0);
			}
			break;

		case RenderPass.None:
			break;
	}

	renderData.renderCtx.updateCommonUniforms();

	// TODO implement clip plane manually
	// if (renderData.renderCtx.enableClipPlane)
	// 	gl.enable(gl.CLIP_DISTANCE0);
	// else
	// 	gl.disable(gl.CLIP_DISTANCE0);
}

function resetRenderPass(renderData: RenderData, pass: RenderPass): void {
	renderData.renderCtx.renderPass = RenderPass.None;
	renderData.renderCtx.enableClipPlane = false;
	if (renderData.config.renderWireFrame) {
		// gl.polygonMode(GL_FRONT_AND_BACK, GL_FILL);
		// gl.lineWidth(1.f);
		// TODO implement wireframe manually
	}

	switch (pass) {
		case RenderPass.Standard:
			renderData.viewport.setBkColor(new Vector(0, 0, 0));
			break;
		case RenderPass.UI:
			gl.enable(gl.DEPTH_TEST);
			break;
		case RenderPass.WaterReflection:
			renderData.waterRenderData.reflectionFramebuffer.unbind();
			renderData.viewport.setArea(0, 0, renderData.windowW, renderData.windowH);
			renderData.viewport.activate();
			renderData.viewport.camera().mirror(new Vector(0, renderData.renderCtx.subspace, 0, 0));
			renderData.viewport.setBkColor(new Vector(0, 0, 0));
			break;
		case RenderPass.WaterRefraction:
			renderData.waterRenderData.refractionFramebuffer.unbind();
			renderData.viewport.setArea(0, 0, renderData.windowW, renderData.windowH);
			renderData.viewport.activate();
			renderData.viewport.setBkColor(new Vector(0, 0, 0));
			break;
		case RenderPass.WaterSurface:
			break;
	}
}

function initPostProcessData(winW: number, winH: number, postProcessData: PostProcessData): boolean {
	// TODO implement
	return true;
	// checkGLError();
	// glGenVertexArrays(1, &postProcessData.VAO);
	// glGenBuffers(1, &postProcessData.VBO);
	// glGenBuffers(1, &postProcessData.IBO);
	// PostProcessData *pPostProcessData = &postProcessData; // need this to avoid a compiler bug where capturing a reference by reference will result in UB
	// // load shader:
	// Shaders::createProgram("data/shaders/postprocess.vert", "data/shaders/postprocess.frag", [pPostProcessData](unsigned id) {
	// 	pPostProcessData->shaderProgram = id;
	// 	if (!pPostProcessData->shaderProgram) {
	// 		ERROR("Unabled to load post-processing shaders!");
	// 		return;
	// 	}
	// 	unsigned posAttrIndex = glGetAttribLocation(pPostProcessData->shaderProgram, "pos");
	// 	unsigned uvAttrIndex = glGetAttribLocation(pPostProcessData->shaderProgram, "uv");
	// 	pPostProcessData->iTexSampler = glGetUniformLocation(pPostProcessData->shaderProgram, "texSampler");
	// 	pPostProcessData->iUnderwater = glGetUniformLocation(pPostProcessData->shaderProgram, "underwater");
	// 	pPostProcessData->iTexSize = glGetUniformLocation(pPostProcessData->shaderProgram, "texSize_inv");
	// 	pPostProcessData->iTime = glGetUniformLocation(pPostProcessData->shaderProgram, "time");

	// 	glBindVertexArray(pPostProcessData->VAO);
	// 	glBindBuffer(gl.ARRAY_BUFFER, pPostProcessData->VBO);
	// 	glEnableVertexAttribArray(posAttrIndex);
	// 	glVertexAttribPointer(posAttrIndex, 2, gl.FLOAT, gl.FALSE, sizeof(float)*4, 0);
	// 	glEnableVertexAttribArray(uvAttrIndex);
	// 	glVertexAttribPointer(uvAttrIndex, 2, gl.FLOAT, gl.FALSE, sizeof(float)*4, (void*)(sizeof(float)*2));
	// 	glBindBuffer(gl.ELEMENT_ARRAY_BUFFER, pPostProcessData->IBO);
	// 	glBindVertexArray(0);
	// 	checkGLError("Postprocess shader");
	// });
	// if (!postProcessData.shaderProgram)
	// 	return false;

	// postProcessData.textureSize = glm::vec2(1.0 / winW, 1.0 / winH);

	// // create screen quad:
	// float screenQuadPosUV[] {
	// 	-1.0, -1.0, 0, 0, 	// bottom-left
	// 	-1.0, +1.0, 0, 1.0, 	// top-left
	// 	+1.0, +1.0, 1.0, 1.0, 	// top-right
	// 	+1.0, -1.0, 1.0, 0, 	// bottom-right
	// };
	// uint16_t screenQuadIdx[] {
	// 	0, 1, 2, 0, 2, 3
	// };

	// glBindBuffer(gl.ARRAY_BUFFER, postProcessData.VBO);
	// glBufferData(gl.ARRAY_BUFFER, sizeof(screenQuadPosUV), screenQuadPosUV, gl.STATIC_DRAW);
	// glBindBuffer(gl.ARRAY_BUFFER, 0);
	// glBindBuffer(gl.ELEMENT_ARRAY_BUFFER, postProcessData.IBO);
	// glBufferData(gl.ELEMENT_ARRAY_BUFFER, sizeof(screenQuadIdx), screenQuadIdx, gl.STATIC_DRAW);
	// glBindBuffer(gl.ELEMENT_ARRAY_BUFFER, 0);

	// return !checkGLError("initPostProcessData");
}

function deletePostProcessData(postProcessData: PostProcessData): void {
	gl.deleteBuffer(postProcessData.VBO);
	gl.deleteBuffer(postProcessData.IBO);
	postProcessData.VAO.release();
}

function renderList(list: IRenderable[], context: RenderContext): void {
	for (let r of list) {
		r.render(context);
		checkGLError("After object render");
	}
}
