import { gl } from "../glcontext";
import { IGLResource } from "../glresource";
import { Vector } from "../math/vector";

type FontConfig = {
	texture: string;
	rows: number;
	columns: number;
	firstChar: string;
	defaultSize: number;
}

export class TextRenderer implements IGLResource {
	private static instance_: TextRenderer;
	static get(): TextRenderer {
		return TextRenderer.instance_;
	}

	/**
	 *
	 * @param fontName the name of a font config json file from the data/fonts/ directory (without the ".json" extension)
	 * @returns
	 */
	static initialize(fontName: string): Promise<void> {
		console.log("Initializing TextRenderer...");
		TextRenderer.instance_ = new TextRenderer();
		return TextRenderer.instance_.initialize(fontName);
	}

	release(): void {

	}

	disableMipMaps(disable: boolean): void {
		this.disableMipMaps_ = disable;
	}

	// prints text - [pos] is the bottom-left corner of the text
	render(text: string, pos: Vector, fontSize: number, color: Vector): void {
		// TODO
		throw new Error("not implemented");
	}


	/** @returns a vector (xy) containing the width and height of rendered text */
	getTextRect(text: string, fontSize: number): Vector {
		// TODO
		throw new Error("not implemented");
	}

	// --------- PRIVATE AREA -------------- //
	private constructor() {}

	private textureID_: WebGLTexture;			// Texture containing the font
	private VBO_: WebGLBuffer;				// Buffer containing the vertices
	private shaderProgram_: WebGLProgram;		// Program used to render the text
	private indexViewportHalfSize_: number;
	private indexTranslation_: number;
	private u_textureID_: WebGLUniformLocation;	// Location of the program's texture attribute
	private config_: FontConfig;
	private cellRatio_: number; 				// cellWeight / cellHidth
	// private vertices_: Vector[];				// these are relative to item's position (below)
	// private std::vector<glm::vec2> UVs_;
	// private std::vector<glm::vec4> colors_;
	// private std::vector<glm::vec2> itemPositions_;
	// private std::vector<int> verticesPerItem_;
	private disableMipMaps_ = false;

	private async initialize(fontName: string): Promise<void> {
		this.config_ = await (await fetch(`/data/fonts/${fontName}.json`)).json();
		this.cellRatio_ = this.config_.rows / this.config_.columns;
		this.VBO_ = gl.createBuffer();
		//gl.texImage2D() // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
	}
};