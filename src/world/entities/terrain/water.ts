import { TextureLoader } from './../../../joglr/texture-loader';
import { gl } from './../../../joglr/glcontext';
import { ShaderWater } from '../../../render/programs/shader-water';
import { Vector } from './../../../joglr/math/vector';
import { Triangle } from './triangulation';
import { IGLResource } from "../../../joglr/glresource";
import { RenderContext } from "../../../joglr/render-context";
import { Progress } from "../../../progress";
import { IRenderable } from "../../renderable";
import { AbstractVertex } from "../../../joglr/abstract-vertex";

export class WaterConfig {
	innerRadius = 50.0;			// radius of 'detailed' water mesh -> should cover the playable area
	outerExtent = 100.0;		// extend from the innerRadius to make the water appear infinite - this area will have fewer vertices
	vertexDensity = 0.1;		// vertices per meter
	constrainToCircle = false;	// true to enable detailed vertex generation only within the circle of radius 'innerRadius'
								// if false, a square of length 2*innerRadius will be used instead (faster)
};
export class Water implements IRenderable, IGLResource {

	static loadTextures(step: number): Progress {
		switch (step) {
			case 0:
				WaterRenderData.textureNormal_ = TextureLoader.loadFromPNG("data/textures/water/normal.png", false).texture;
				gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureNormal_);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);//gl.NEAREST_MIPMAP_LINEAR);// gl.LINEAR_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			break;
			case 1:
				WaterRenderData.textureFoam = TextureLoader.loadFromPNG("data/textures/water/foam.png", true).texture;
				gl.bindTexture(gl.TEXTURE_2D, WaterRenderData.textureFoam);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			break;
		}
		gl.bindTexture(gl.TEXTURE_2D, 0);

		return {completed: step+1, total: 2};
	}

	constructor() {
		// TODO implement
	}

	release(): void {
		if (this.renderData_) {
			this.renderData_.shaderProgram_.onProgramReloaded.remove(this.renderData_.reloadHandler);
			this.renderData_ = null;1
		}
	}

	render(context: RenderContext): void {
		// TODO: implement
	}

	generate(params: WaterConfig): void {
		// TODO implement
	}

	setReflectionTexture(tex_2D: WebGLTexture): void {
		// TODO implement
	}

	setRefractionTexture(texture: WebGLTexture, textureCube: WebGLTexture): void {
		// TODO implement
	}

	update(float dt): void {
		// TODO implement
	}

	getNormalTexture(): number {

	}

	// ---------------------- PRIVATE AREA --------------------------- //

	private config_: WaterConfig;
	private renderData_: WaterRenderData;
	private vertices_: WaterVertex[];
	private nVertices_: number;
	private triangles_: Triangle[];
}

class WaterRenderData {
	// VAO_: number;
	VBO_: number;
	IBO_: number;

	shaderProgram_: ShaderWater;
	reloadHandler: number;

	static textureNormal_: WebGLTexture;
	static textureFoam: WebGLTexture;

	textureReflection_: number;
	textureRefraction_Cube_: number;
	textureRefraction_: number;
};

class WaterVertex extends AbstractVertex {
	pos: Vector; // 3
	fog: number; // 1

	static getSize(): number {
		return 4 * (3 + 1);
	}

	static getOffset(field: keyof WaterVertex): number {
		switch (field) {
			case 'pos': return 4 * 0;
			case 'fog': return 4 * 3;
			default: throw new Error(`Invalid field specified in WaterVertex.getOffset(): "${field}`);
		}
	}

	getSize(): number {
		return WaterVertex.getSize();
	}

	serialize(target: Float32Array, offset: number) {
		const values: number[] = [
			...this.pos.values(3),
			this.fog
		];
		target.set(values, offset);
	}
};
