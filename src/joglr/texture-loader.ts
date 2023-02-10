import { gl } from './glcontext';
export class TextureInfo {
	texture: WebGLTexture;
	width: number;
	height: number;
}

export class TextureLoader {
	// [linearizeValues] - if true, it will apply gamma correction to bring the image from sRGB space into linear space
	// [outWidth] and [outHeight] will be filled with the texture size, if provided.
	static loadFromPNG(url: string, linearizeValues: boolean): Promise<TextureInfo> {
		// see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Because images have to be downloaded over the internet
		// they might take a moment until they are ready.
		// Until then put a single pixel in the texture so we can
		// use it immediately. When the image has finished downloading
		// we'll update the texture with the contents of the image.
		const level = 0;
		const internalFormat = gl.RGBA;
		const width = 1;
		const height = 1;
		const border = 0;
		const srcFormat = gl.RGBA;
		const srcType = gl.UNSIGNED_BYTE;
		const pixels = new Uint8Array([255, 0, 255, 255]); // opaque magenta until the image is loaded
		gl.texImage2D(
			gl.TEXTURE_2D,
			level,
			internalFormat,
			width,
			height,
			border,
			srcFormat,
			srcType,
			pixels
		);
		return new Promise(resolve => {
			const image = new Image();
			image.onload = () => {
				gl.bindTexture(gl.TEXTURE_2D, texture);
				if (linearizeValues) {
					const imageData: Uint8ClampedArray = TextureLoader.getLinearizedImageData(image);
					gl.texImage2D(
						gl.TEXTURE_2D,
						level,
						internalFormat,
						srcFormat,
						srcType,
						0,
						internalFormat,
						srcType,
						imageData
					);
				} else {
					gl.texImage2D(
						gl.TEXTURE_2D,
						level,
						internalFormat,
						srcFormat,
						srcType,
						image
					);
				}


				// WebGL1 has different requirements for power of 2 images
				// vs. non power of 2 images so check if the image is a
				// power of 2 in both dimensions.
				if (TextureLoader.isPowerOf2(image.width) && TextureLoader.isPowerOf2(image.height)) {
					// Yes, it's a power of 2. Generate mips.
					gl.generateMipmap(gl.TEXTURE_2D);
				} else {
					// No, it's not a power of 2. Turn off mips and set
					// wrapping to clamp to edge
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				}
				gl.bindTexture(gl.TEXTURE_2D, null);
				resolve(<TextureInfo>{
					texture,
					width: image.naturalWidth,
					height: image.naturalHeight
				});
			};
			image.src = url;
		});
	}

	// loads a cube texture from 6 files.
	// the order of the filenames must be:
	// X+, X-, Y+, Y-, Z+, Z-
	// if one or more of the cube faces are not required, specify empty strings for their respective filenames
	static loadCubeFromPNG(paths: string[], linearizeValues: boolean): Promise<TextureInfo[]> {
		// TODO implement
		throw new Error("not implemented");
	}

	// ------------------------------- PRIVATE AREA ------------------------------- //

	private static getLinearizedImageData(image: HTMLImageElement): Uint8ClampedArray {
		if (!TextureLoader.canvas) {
			TextureLoader.createCanvas();
		}
		TextureLoader.canvas.width = image.width;
		TextureLoader.canvas.height = image.height;
		const canvasContext = TextureLoader.canvas.getContext("2d");
		canvasContext.clearRect(0, 0, image.width, image.height);
		canvasContext.drawImage(image, 0, 0);
		const data: Uint8ClampedArray = canvasContext.getImageData(0, 0, image.width, image.height).data;
		const gamma = 2.2;
		for (let i=0; i<data.length; i++) {
			if (i % 4 === 3) {
				continue; // leave the alpha component as it is
			}
			data[i] = Math.floor(255 * Math.pow(data[i] / 255.0, gamma));
		}
		return data;
	}

	private static createCanvas(): void {
		TextureLoader.canvas = document.createElement("canvas");
	}

	private static isPowerOf2(value: number): boolean {
		return (value & (value - 1)) === 0;
	}

	private static canvas: HTMLCanvasElement;
};