type pixelOperators<PIXEL_TYPE> = {
	new: () => PIXEL_TYPE;
	add: (p1: PIXEL_TYPE, p2: PIXEL_TYPE) => PIXEL_TYPE;
	scale: (p: PIXEL_TYPE, s: number) => PIXEL_TYPE;
};

/** Blurs an image over a given radius. Returns a new image, leaving the original intact */
export function blurImage<PIXEL_TYPE>(args: {
	pixels: PIXEL_TYPE[];
	rows: number;
	cols: number;
	radius: number;
	ops: pixelOperators<PIXEL_TYPE>;
}): PIXEL_TYPE[] {
	const irad: number = Math.round(args.radius);
	const rsq = args.radius * args.radius;
	const out: PIXEL_TYPE[] = [];
	for (let i = 0; i < args.rows; i++) {
		for (let j = 0; j < args.cols; j++) {
			let val: PIXEL_TYPE = args.ops.new();
			let denom = 0;
			for (let ii = -irad; ii <= irad; ii++) {
				for (let jj = -irad; jj <= irad; jj++) {
					const cubicFactor = (rsq - ii * ii + jj * jj) / rsq;
					if (cubicFactor <= 0) continue; // the point is outside blur radius
					const ri = i + ii; // row index
					const ci = j + jj; // column index
					if (ri < 0 || ri >= args.rows || ci < 0 || ci >= args.cols) {
						continue; // we're outside the field
					}
					val = args.ops.add(val, args.ops.scale(args.pixels[ri * args.cols + ci], cubicFactor));
					denom += cubicFactor;
				}
			}
			out[i * args.cols + j] = args.ops.scale(val, 1 / denom);
		}
	}
	return out;
}
