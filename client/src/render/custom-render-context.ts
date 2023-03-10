import { SharedUniformPacks } from "./programs/shared-uniform-packs";
import { CustomMeshRenderer } from "./custom-mesh-renderer";
import { RenderContext } from "../joglfw/render/render-context";

export enum RenderPass {
	None = "None",
	WaterReflection = "WaterReflection", // off-screen rendering for water reflection texture
	WaterRefraction = "WaterRefraction", // off-screen rendering for water refraction texture
	Standard = "Standard", // standard default rendering of scene
	WaterSurface = "WaterSurface", // draw water surface using the reflection and refraction textures
	UI = "UI", // 2D user interface
}

export class CustomRenderContext extends RenderContext {
	static fromCtx(r: RenderContext): CustomRenderContext {
		if (r instanceof CustomRenderContext) {
			return r;
		} else {
			return null;
		}
	}

	renderPass = RenderPass.None;

	subspace = 1.0;
	enableClipPlane = false;
	cameraUnderwater = false;
	enableWaterRender = false;
	enableWireframe = false;
	time = 0;

	meshRenderer: CustomMeshRenderer = null;

	updateCommonUniforms(): void {
		if (!SharedUniformPacks.upCommon) {
			throw new Error("Uniform pack not initialized!");
		}
		const unifCommon = SharedUniformPacks.upCommon;
		unifCommon.setbReflection(this.renderPass == RenderPass.WaterReflection);
		unifCommon.setbRefraction(this.renderPass == RenderPass.WaterRefraction);
		unifCommon.setEyePos(this.activeCamera().position());
		unifCommon.setMatViewProj(this.activeCamera().matViewProj());
		unifCommon.setEnableClipping(this.enableClipPlane);
		unifCommon.setSubspace(this.subspace);
		unifCommon.setTime(this.time);
		unifCommon.setFOV(this.activeCamera().FOV(), this.activeViewport.aspectRatio());
		unifCommon.setMatView(this.activeCamera().matView());
	}
}
