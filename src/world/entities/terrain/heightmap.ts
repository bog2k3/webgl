import { rand } from './../../../joglr/utils/random';
import { clamp, nextPowerOfTwo } from "../../../joglr/math/functions";
import { srand } from "../../../joglr/utils/random";

export class HeightmapParams {
	/** minimum width on X axis (actual may be greater) */
	width: number;
	/** minimum length on Z axis (actual may be greater) */
	length: number;
	/** lower displacement value on Y axis (may be negative) */
	minHeight: number;
	/** higher displacement value on Y axis (may be negative) */
	maxHeight: number;
};

export class Heightmap {

	/** jitter is multiplied by this factor at each iteration */
	private static readonly jitterReductionFactor = 0.5;

	constructor (params: HeightmapParams) {
		this.width_ = nextPowerOfTwo(params.width) + 1;
		this.length_ = nextPowerOfTwo(params.length) + 1;
		this.baseY_ = params.minHeight;
		this.amplitude_ = params.maxHeight - params.minHeight;
		this.values_ = new Array(this.width_ * this.length_);

		this.generate();
	}

	/** blurs the heightmap over a given radius */
	blur(radius: number): void {
		// TODO must implement imgUtil first
		// const newValues: number[] = new Array(this.width_ * this.length_);
		// imgUtil.blur(this.values_, this.length_, this.width_, radius, newValues);
		// this.values_ = newValues;
		// this.normalizeValues();
	}

	/** return the interpolated height value at position with normalized coordinates (u, v) <- [0.0, 1.0] */
	value(u: number, v: number): number {
		u = clamp(u, 0, 1);
		v = clamp(v, 0, 1);
		// bilinear filtering by sampling the 4 nearest neighbours
		const rf = v * this.length_;		// floating point row coord
		const cf = u * this.width_;		// floating point column coord
		let r = Math.floor(rf);	// row index
		let c = Math.floor(cf);	// column index
		let uWeight = cf - c - 0.5;	// u blending weight
		let vWeight = rf - r - 0.5;	// v blending weight
		if (uWeight < 0) {
			c--;
			uWeight += 1;
		}
		if (vWeight < 0) {
			r--;
			vWeight += 1;
		}
		const f1 = this.getSample(r, c) * (1.0 - uWeight) + this.getSample(r, c+1) * uWeight;
		const f2 = this.getSample(r + 1, c) * (1.0 - uWeight) + this.getSample(r+1, c+1) * uWeight;
		return this.baseY_ + f1 * (1.0 - vWeight) + f2 * vWeight;
	}

	// --------------- PRIVATE AREA ------------------//
	private width_: number;
	private length_: number;
	private baseY_: number;
	private amplitude_: number;
	private values_: number[];

	private computeDiamondSquareStep(elements: HeightmapElement[], r1: number, r2: number, c1: number, c2: number, jitterAmp: number) {
		const midR: number = (r1 + r2) / 2;
		const midC: number = (c1 + c2) / 2;
		// center (diamond step)
		elements[midR * this.width_ + midC].add(0.25 * (
			elements[r1 * this.width_ + c1].get() +
			elements[r1 * this.width_ + c2].get() +
			elements[r2 * this.width_ + c1].get() +
			elements[r2 * this.width_ + c2].get()
		) + srand() * jitterAmp);
		const centerValue: number = elements[midR * this.width_ + midC].get();
		// now square step:
		// top midpoint:
		if (c2 > c1+1)
			elements[r1 * this.width_ + midC].add(0.3333 * (
				elements[r1 * this.width_ + c1].get() +
				elements[r1 * this.width_ + c2].get() +
				centerValue
			) + srand() * jitterAmp);
		// bottom midpoint:
		if (c2 > c1+1)
			elements[r2 * this.width_ + midC].add(0.3333 * (
				elements[r2 * this.width_ + c1].get() +
				elements[r2 * this.width_ + c2].get() +
				centerValue
			) + srand() * jitterAmp);
		// left midpoint:
		if (r2 > r1+1)
			elements[midR * this.width_ + c1].add(0.3333 * (
				elements[r1 * this.width_ + c1].get() +
				elements[r2 * this.width_ + c1].get() +
				centerValue
			) + srand() * jitterAmp);
		// right midpoint:
		if (r2 > r1+1)
			elements[midR * this.width_ + c2].add(0.3333 * (
				elements[r1 * this.width_ + c2].get() +
				elements[r2 * this.width_ + c2].get() +
				centerValue
			) + srand() * jitterAmp);
	}

	private generate(): void {
		const elements: HeightmapElement[] = Array.from(Array(this.width_ * this.length_), () => new HeightmapElement());
		// seed the corners:
		elements[0].add(this.amplitude_ * rand());
		elements[this.width_-1].add(this.amplitude_ * rand());
		elements[(this.length_-1)*this.width_].add(this.amplitude_ * rand());
		elements[this.width_ * this.length_ - 1].add(this.amplitude_ * rand());
		// seed the center...
		elements[(this.length_-1)/2*this.width_ + (this.width_-1)/2].add(this.amplitude_ * rand());
		// ...and the 4 edge mid-points as well
		elements[(this.width_-1)/2].add(this.amplitude_ * rand());
		elements[(this.length_-1)*this.width_ + (this.width_-1)/2].add(this.amplitude_ * rand());
		elements[(this.length_-1)/2*this.width_].add(this.amplitude_ * rand());
		elements[(this.length_-1)/2*this.width_ + (this.width_-1)].add(this.amplitude_ * rand());

		const vSteps: {
			r1: number, r2: number, c1: number, c2: number;
			jitterAmp: number;
		}[] = [];

		vSteps.push({
			r1: 0, r2: this.length_ - 1,
			c1: 0, c2: this.width_ - 1,
			jitterAmp: this.amplitude_ * Heightmap.jitterReductionFactor
		});
		let index = 0;
		// compute diamond displacement iteratively:
		while (index < vSteps.length) {
			const r1 = vSteps[index].r1;
			const r2 = vSteps[index].r2;
			const c1 = vSteps[index].c1;
			const c2 = vSteps[index].c2;
			this.computeDiamondSquareStep(elements, r1, r2, c1, c2, vSteps[index].jitterAmp);
			if (c2 > c1+2 || r2 > r1+2) {
				const midR = (r1 + r2) / 2;
				const midC = (c1 + c2) / 2;
				// top-left
				vSteps.push({r1: r1, r2: midR, c1: c1, c2: midC, jitterAmp: vSteps[index].jitterAmp * Heightmap.jitterReductionFactor});
				// top-right
				vSteps.push({r1: r1, r2: midR, c1: midC, c2: c2, jitterAmp: vSteps[index].jitterAmp * Heightmap.jitterReductionFactor});
				// bottom-left
				vSteps.push({r1: midR, r2: r2, c1: c1, c2: midC, jitterAmp: vSteps[index].jitterAmp * Heightmap.jitterReductionFactor});
				// bottom-right
				vSteps.push({r1: midR, r2: r2, c1: midC, c2: c2, jitterAmp: vSteps[index].jitterAmp * Heightmap.jitterReductionFactor});
			}
			index++;
		}
		// bake the values:
		for (let i=0; i<this.width_*this.length_; i++) {
			this.values_[i] = elements[i].value / elements[i].divider;
		}

		// renormalize the values to fill the entire height range
		this.normalizeValues();
	}

	private getSample(r: number, c: number): number {
		r = clamp(r, 0, this.length_ - 1);
		c = clamp(c, 0, this.width_ - 1);
		return this.values_[r * this.width_ + c];
	}

	private normalizeValues(): void {
		let vmin = 1e20;
		let vmax = -1e20;
		for (let i=0; i<this.width_ * this.length_; i++) {
			if (this.values_[i] < vmin)
				vmin = this.values_[i];
			if (this.values_[i] > vmax)
				vmax = this.values_[i];
		}
		const scale = this.amplitude_ / (vmax - vmin);
		for (let i=0; i<this.width_ * this.length_; i++) {
			this.values_[i] = (this.values_[i] - vmin) * scale;
		}
	}
};

class HeightmapElement {
	value = 0.0;
	divider = 0;

	add(value: number): void {
		this.value += value;
		this.divider++;
	}

	get(): number { return this.value / this.divider; }
};