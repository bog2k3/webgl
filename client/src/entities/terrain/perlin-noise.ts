import { Vector } from "../../joglfw/math/vector";
import { randomShuffle, srand } from "../../joglfw/utils/random";

export class PerlinNoise {
	/** Constructs a new 2D perlin noise function with a lattice of [width]x[height] size. */
	constructor(private readonly width: number, private readonly height: number) {
		this.gradients = new Array((width + 1) * (height + 1));
		this.generate();
	}

	/**
	 * Returns the perlin noise function at (u,v).
	 * Coordinates 0.0 and 1.0 correspond to the edges of the noise map and
	 * coordinates outside of this range are wrapped around automatically.
	 * Returned values are mapped to [-1.0, +1.0] interval.
	 * @param contrast controls the steepness of transition between low values and high values.
	 * [contrast] of 1.0 means smooth, linear transition, while > 1.0 means a higher contrast, with more separation between highs and lows
	 */
	get(u: number, v: number, contrast: number): number {
		const pf = new Vector(u * (this.width + 1), v * (this.height + 1));

		const c0 = Math.floor(pf.x); // left column
		const r0 = Math.floor(pf.y); // top row
		const p0 = new Vector(c0, r0); // top left lattice point
		const p1 = new Vector(c0 + 1, r0); // top right lattice point
		const p2 = new Vector(c0, r0 + 1); // bottom left lattice point
		const p3 = new Vector(c0 + 1, r0 + 1); // bottom right lattice point

		const uF = this.srpPolynomial(pf.x - c0); // u interpolation factor
		const vF = this.srpPolynomial(pf.y - r0); // v interpolation factor

		// sample gradient vectors from lattice:
		const g0: Vector =
			this.gradients[this.wrap(p0.y, this.height + 1) * (this.width + 1) + this.wrap(p0.x, this.width + 1)];
		const g1: Vector =
			this.gradients[this.wrap(p1.y, this.height + 1) * (this.width + 1) + this.wrap(p1.x, this.width + 1)];
		const g2: Vector =
			this.gradients[this.wrap(p2.y, this.height + 1) * (this.width + 1) + this.wrap(p2.x, this.width + 1)];
		const g3: Vector =
			this.gradients[this.wrap(p3.y, this.height + 1) * (this.width + 1) + this.wrap(p3.x, this.width + 1)];

		const samp01: number = (1 - uF) * g0.dot(pf.sub(p0)) + g1.dot(pf.sub(p1)) * uF;
		const samp23: number = (1 - uF) * g2.dot(pf.sub(p2)) + g3.dot(pf.sub(p3)) * uF;

		const value = (1 - vF) * samp01 + vF * samp23;
		return this.contrastFn(value, contrast); // adjust contrast
	}

	/** same as get, except the returned values are normalized into [0.0, +1.0] */
	getNorm(u: number, v: number, contrast: number): number {
		return this.get(u, v, contrast) * 0.5 + 0.5;
	}

	// -------------------- PRIVATE AREA ------------------------- //
	private gradients: Vector[];

	// 5th degree polynomial function for S-curve interpolation
	srpPolynomial(t: number): number {
		return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
	}

	wrap(x: number, size: number): number {
		while (x < 0) x += size;
		while (x >= size) x -= size;
		return x;
	}

	// changes the contrast of a distribution by adjusting the separation between low and high values
	contrastFn(x: number, c: number): number {
		if (x > 0) return Math.pow(x, 1 / c);
		else if (x == 0) return x;
		else return -Math.pow(-x, 1 / c);
	}

	private generate(): void {
		// generate gradient template vectors
		const nTemplates = 128;
		const gradTemplates: Vector[] = new Array(nTemplates);
		for (let i = 0; i < nTemplates; i++) {
			gradTemplates[i] = new Vector(srand(), srand()).normalize();
		}
		// generate gradient template indexes
		const tIndex: number[] = [];
		for (let i = 0; i < nTemplates; i++) tIndex[i] = i;
		randomShuffle(tIndex);
		// compute lattice gradient vectors
		for (let i = 0; i <= this.height; i++) {
			for (let j = 0; j <= this.width; j++) {
				const index: number = tIndex[(tIndex[i % nTemplates] + j) % nTemplates];
				this.gradients[i * (this.width + 1) + j] = gradTemplates[index];
			}
		}
	}
}
