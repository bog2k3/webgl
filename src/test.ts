import { Triangle, triangulate } from './world/entities/terrain/triangulation';

class VT {
	x: number;
	y: number;
}

function nth_elem(v: VT, n: number) {
	return v[["x", "y"][n]];
}

export function DEBUG_ENTRY() {

	const v: VT[] = [{
		x: -1, y: -1	// #0 bottom left
	}, {
		x: -1, y: +1	// #1 top left
	}, {
		x: +1, y: +1	// #2 top right
	}, {
		x: +1, y: -1	// #3 bottom right
	}];

	const tris: Triangle[] = triangulate(v, nth_elem);
	console.log(tris);
}
