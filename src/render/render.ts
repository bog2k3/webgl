import { checkGLError } from "../joglr/glcontext";
import { Vector } from "../joglr/math/vector";
import { assert } from "../joglr/utils/assert";
import { Terrain } from "../world/entities/terrain/terrain.entity";
import { IRenderable } from "../joglr/renderable";
import { World } from "../world/world";
import { gl } from "./../joglr/glcontext";
import { Water } from "./../world/entities/terrain/water";
import { Entity } from "./../world/entity";
import { RenderPass } from "./custom-render-context";
import { SharedUniformPacks } from "./programs/shared-uniform-packs";
import { PostProcessData, RenderData } from "./render-data";

export function initRender(renderData: RenderData): boolean {
	SharedUniformPacks.initialize();
	renderData["setupDependencies"]();

	// configure backface culling
	gl.frontFace(gl.CW);
	gl.cullFace(gl.BACK);
	// gl.enable(gl.CULL_FACE);
	gl.disable(gl.CULL_FACE);

	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);

	// set up post processing hook
	// TODO implement
	// if (initPostProcessData(renderData.windowW, renderData.windowH, renderData.postProcessData)) {
	// 	const multisamples = 4; // >0 for MSSAA, 0 to disable
	// 	setPostProcessHook(PostProcessStep::POST_DOWNSAMPLING, std::bind(renderPostProcess, std::ref(renderData)), multisamples);
	// }

	// set up water refraction framebuffer
	renderData.waterRenderData.refractionFBDesc.width = renderData.windowW / 2;
	renderData.waterRenderData.refractionFBDesc.height = renderData.windowH / 2;
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
	renderData.waterRenderData.reflectionFBDesc.width = renderData.windowW / 2;
	renderData.waterRenderData.reflectionFBDesc.height = renderData.windowH / 2;
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

	// load render helpers
	// RenderHelpers::Config rcfg = RenderHelpers::defaultConfig();
	// RenderHelpers::load(rcfg);
	// TODO cleanup

	// set up viewport and camera
	renderData.viewport.setBkColor(new Vector(0, 0, 0));
	renderData.viewport.camera().setFOV(Math.PI / 2.5);
	renderData.viewport.camera().setZPlanes(0.15, 1000);
	renderData.viewport.camera().moveTo(new Vector(-5, 5, -5));
	renderData.viewport.camera().lookAt(new Vector(0, 0, 0));

	// done
	return true;
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

export function render(renderData: RenderData, world: World): void {
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
		renderData.viewport.renderList(
			renderData.renderCtx.cameraUnderwater ? underDraw : aboveDraw,
			renderData.renderCtx,
		);
		resetRenderPass(renderData, RenderPass.WaterReflection);
		checkGLError("render() pass #1");

		// 2nd pass - refraction
		setupRenderPass(renderData, RenderPass.WaterRefraction);
		renderData.viewport.renderList(
			renderData.renderCtx.cameraUnderwater ? aboveDraw : underDraw,
			renderData.renderCtx,
		);
		resetRenderPass(renderData, RenderPass.WaterRefraction);
		checkGLError("render() pass #2");

		// 3rd pass - standard rendering of scene
		setupRenderPass(renderData, RenderPass.Standard);
		renderData.viewport.renderList(
			renderData.renderCtx.cameraUnderwater ? underDraw : aboveDraw,
			renderData.renderCtx,
		);
		resetRenderPass(renderData, RenderPass.Standard);
		checkGLError("render() pass #3");

		// 4th pass - physics debug draw
		if (renderData.config.renderPhysicsDebug) {
			// World::getGlobal<btDiscreteDynamicsWorld>()->debugDrawWorld(); // TODO implement
		}
	} else {
		renderData.renderCtx.cameraUnderwater = false;
		renderData.viewport.clear();
		// no water, just render everything in one pass:
		setupRenderPass(renderData, RenderPass.Standard);
		renderData.viewport.renderList([world], renderData.renderCtx);
		if (renderData.config.renderPhysicsDebug) {
			// World::getGlobal<btDiscreteDynamicsWorld>()->debugDrawWorld(); // TODO implement
		}
		resetRenderPass(renderData, RenderPass.Standard);
	}

	checkGLError("render() pass #3");

	// 4th pass - water surface
	if (renderData.renderCtx.enableWaterRender) {
		assert(renderData.terrain !== null, "terrain pointer not set!");
		setupRenderPass(renderData, RenderPass.WaterSurface);
		renderData.viewport.renderList([renderData.terrain], renderData.renderCtx);
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
			renderData.viewport.setBkColor(renderData.waterRenderData.waterColor.scale(waterDepthFactor));
			renderData.viewport.clear();
			renderData.renderCtx.subspace = renderData.renderCtx.cameraUnderwater ? -1.0 : +1.0;
			renderData.renderCtx.enableClipPlane = true;
			renderData.viewport.camera().mirror(new Vector(0, renderData.renderCtx.subspace, 0, 0));
			break;
		case RenderPass.WaterRefraction:
			{
				renderData.waterRenderData.refractionFramebuffer.bind();
				renderData.viewport.setArea(
					0,
					0,
					renderData.waterRenderData.refractionFBDesc.width,
					renderData.waterRenderData.refractionFBDesc.height,
				);
				renderData.viewport.setBkColor(new Vector(0.07, 0.16, 0.2, 1.0));
				renderData.viewport.clear();
				renderData.renderCtx.subspace = renderData.renderCtx.cameraUnderwater ? +1.0 : -1.0;
				renderData.renderCtx.enableClipPlane = true;
			}
			break;
		case RenderPass.Standard:
			{
				renderData.renderCtx.subspace = renderData.renderCtx.cameraUnderwater ? -1.0 : +1.0;
				renderData.renderCtx.enableClipPlane = renderData.renderCtx.enableWaterRender;
				if (renderData.renderCtx.cameraUnderwater) {
					renderData.viewport.setBkColor(renderData.waterRenderData.waterColor.scale(waterDepthFactor));
					renderData.viewport.clear();
				}
			}
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
			renderData.viewport.camera().mirror(new Vector(0, renderData.renderCtx.subspace, 0, 0));
			renderData.viewport.setBkColor(new Vector(0, 0, 0));
			break;
		case RenderPass.WaterRefraction:
			renderData.waterRenderData.refractionFramebuffer.unbind();
			renderData.viewport.setArea(0, 0, renderData.windowW, renderData.windowH);
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
