export class TextureInfo {
	texture: WebGLTexture;
	width: number;
	height: number;
}

export class TextureLoader {
	// [linearizeValues] - if true, it will apply gamma correction to bring the image from sRGB space into linear space
	// [outWidth] and [outHeight] will be filled with the texture size, if provided.
	static loadFromPNG(path: string, linearizeValues: boolean): TextureInfo {
		// TODO implement
		throw new Error("not implemented");
	}

	// loads a cube texture from 6 files.
	// the order of the filenames must be:
	// X+, X-, Y+, Y-, Z+, Z-
	// if one or more of the cube faces are not required, specify empty strings for their respective filenames
	static loadCubeFromPNG(paths: string[], linearizeValues: boolean): TextureInfo[] {
		// TODO implement
		throw new Error("not implemented");
	}
};