import { gl } from "./glcontext";
import { logprefix } from "./log";
export class TextureInfo {
	texture: WebGLTexture;
	width: number;
	height: number;
}

logprefix("TextureLoader");

export class TextureLoader {
	/** [linearizeValues] - if true, it will apply gamma correction to bring the image from sRGB space into linear space */
	static load(url: string, linearizeValues: boolean): Promise<TextureInfo> {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		const pixels = new Uint8Array([255, 0, 255, 255]); // opaque magenta until the image is loaded
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		gl.bindTexture(gl.TEXTURE_2D, null);

		return this.loadAndProcessImage(url, linearizeValues)
			.then((image: LoadedImage) => {
				gl.bindTexture(gl.TEXTURE_2D, texture);
				if (image.data instanceof Uint8ClampedArray) {
					gl.texImage2D(
						gl.TEXTURE_2D,
						0,
						gl.RGBA,
						image.width,
						image.height,
						0,
						gl.RGBA,
						gl.UNSIGNED_BYTE,
						image.data,
					);
				} else {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
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
				return <TextureInfo>{
					texture,
					width: image.width,
					height: image.height,
				};
			})
			.catch((err) => {
				console.error(`Failed to load texture from ${url}: `, err);
				// if it failed, it will remain magenta
				return <TextureInfo>{
					texture,
					width: 1,
					height: 1,
				};
			});
	}

	// loads a cube texture from 6 files.
	// the order of the filenames must be:
	// X+, X-, Y+, Y-, Z+, Z-
	// if one or more of the cube faces are not required, specify empty strings for their respective filenames
	static async loadCube(urls: string[], linearizeValues: boolean): Promise<WebGLTexture> {
		const texture: WebGLTexture = gl.createTexture();

		const faceIds: number[] = [
			gl.TEXTURE_CUBE_MAP_POSITIVE_X,
			gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
			gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
			gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
			gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
			gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
		];

		const skippedFaces: number[] = [];
		const loadPromises: Promise<void>[] = [];
		for (let i = 0; i < 6; i++) {
			if (urls[i].length === 0) {
				skippedFaces.push(i);
				continue;
			}
			loadPromises.push(
				TextureLoader.loadAndProcessImage(urls[i], linearizeValues).then((image: LoadedImage) => {
					gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
					if (image.data instanceof HTMLImageElement) {
						gl.texImage2D(faceIds[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
					} else {
						gl.texImage2D(
							faceIds[i],
							0,
							gl.RGBA,
							image.width,
							image.height,
							0,
							gl.RGBA,
							gl.UNSIGNED_BYTE,
							image.data,
						);
					}
				}),
			);
		}
		if (skippedFaces.length) {
			const dummyPixels = new Uint8Array([255, 0, 255, 255]); // opaque magenta for missing faces
			for (let i of skippedFaces) {
				gl.texImage2D(faceIds[i], 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, dummyPixels);
			}
		}
		await Promise.all(loadPromises);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

		return texture;
	}

	// ------------------------------- PRIVATE AREA ------------------------------- //

	private static getLinearizedImageData(image: HTMLImageElement): Uint8ClampedArray {
		if (!TextureLoader.canvas) {
			TextureLoader.createCanvas();
		}
		TextureLoader.canvas.width = image.width;
		TextureLoader.canvas.height = image.height;
		TextureLoader.canvasContext.clearRect(0, 0, image.width, image.height);
		TextureLoader.canvasContext.drawImage(image, 0, 0);
		const data: Uint8ClampedArray = TextureLoader.canvasContext.getImageData(0, 0, image.width, image.height).data;
		const gamma = 2.2;
		for (let i = 0; i < data.length; i++) {
			if (i % 4 === 3) {
				continue; // leave the alpha component as it is
			}
			data[i] = Math.floor(255 * Math.pow(data[i] / 255.0, gamma));
		}
		return data;
	}

	private static createCanvas(): void {
		TextureLoader.canvas = document.createElement("canvas");
		TextureLoader.canvasContext = TextureLoader.canvas.getContext("2d", { willReadFrequently: true });
	}

	private static isPowerOf2(value: number): boolean {
		return (value & (value - 1)) === 0;
	}

	/**
	 * Loads the image, processes it and uploads it into the target. Returns both the image data and the width and height of the loaded image.
	 * @param target gl.TEXTURE_2D or gl.TEXTURE_CUBE_MAP_XXX (a cube face)
	 */
	private static loadAndProcessImage(url: string, linearizeValues: boolean): Promise<LoadedImage> {
		// see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
		return new Promise((resolve) => {
			const image = new Image();
			image.onload = () => {
				const result = <LoadedImage>{
					data: image,
					height: image.naturalHeight,
					width: image.naturalWidth,
				};
				if (linearizeValues) {
					result.data = TextureLoader.getLinearizedImageData(image);
				}
				resolve(result);
			};
			image.src = url;
		});
	}

	private static canvas: HTMLCanvasElement;
	private static canvasContext: CanvasRenderingContext2D;
}

type LoadedImage = {
	data: HTMLImageElement | Uint8ClampedArray;
	width: number;
	height: number;
};
