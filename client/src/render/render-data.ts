import { RenderContext } from "../joglfw/render/render-context";
import { CustomRenderContext } from "./custom-render-context";
import { Viewport } from "../joglfw/render/viewport";
import { FrameBuffer, FrameBufferDescriptor } from "./../joglfw/render/frame-buffer";
import { Vector } from "./../joglfw/math/vector";
import { defaultShaderPreprocessor } from "../joglfw/render/default-shader-preprocessor";
import { CustomMeshRenderer } from "./custom-mesh-renderer";
import { VertexArrayObject } from "../joglfw/render/vao";
import { IGLResource } from "../joglfw/glresource";
import { SkyBox } from "../entities/skybox";
import { Terrain } from "../entities/terrain/terrain.entity";
import { Shaders } from "../joglfw/render/shaders";

export class PostProcessData {
	VAO = new VertexArrayObject();
	VBO = 0;
	IBO = 0;
	shaderProgram: WebGLProgram;
	iTexSampler = 0;
	iUnderwater = 0;
	iTexSize = 0;
	iTime = 0;

	textureSize: Vector;
}

export class WaterRenderData {
	refractionFBDesc = new FrameBufferDescriptor();
	reflectionFBDesc = new FrameBufferDescriptor();
	refractionFramebuffer = new FrameBuffer();
	reflectionFramebuffer = new FrameBuffer();

	waterColor = new Vector(0.06, 0.16, 0.2);
}

export class RenderConfig {
	renderWireFrame = false;
	renderPhysicsDebug = false;
}

export class RenderData implements IGLResource {
	config = new RenderConfig();
	viewport: Viewport;
	renderCtx = new CustomRenderContext();
	windowW = 0;
	windowH = 0;
	defaultFrameBuffer = 0;

	// assign your own function to this to perform debug drawing after postprocessing
	drawDebugData: (context: RenderContext) => void;

	waterRenderData = new WaterRenderData();
	postProcessData = new PostProcessData();

	shaderPreprocessor = defaultShaderPreprocessor;

	skyBox: SkyBox = null;
	terrain: Terrain = null;

	constructor(winW: number, winH: number) {
		this.viewport = new Viewport(0, 0, winW, winH);
		this.windowW = winW;
		this.windowH = winH;
		this.renderCtx.setActiveViewport(this.viewport);
	}

	release() {
		Shaders.useShaderPreprocessor(null);
		this.renderCtx.meshRenderer = null;
	}

	public setupDependencies(): void {
		Shaders.useShaderPreprocessor(this.shaderPreprocessor);
		this.renderCtx.meshRenderer = new CustomMeshRenderer();
	}
}
