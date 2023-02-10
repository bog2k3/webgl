import Delaunator from "delaunator";

export class Triangle {
	iV1: number; // index of 1st vertex
	iV2: number; // index of 2nd vertex
	iV3: number; // index of 3rd vertex
	// iN12: number; // index of neighbour Triangle at edge 1-2 (-1 if no neighbour)
	// iN13: number; // index of neighbour Triangle at edge 1-3 (-1 if no neighbour)
	// iN23: number; // index of neighbour Triangle at edge 2-3 (-1 if no neighbour)
};

// return the n-th component of the vertex v.
// usually, 0th element is .x, 1th is .y
export type NTH_ELEM_FN<VERTEX_TYPE> = (v: VERTEX_TYPE, n: number) => number;

export function triangulate<VERTEX_TYPE>(points: VERTEX_TYPE[], nth_elem: NTH_ELEM_FN<VERTEX_TYPE>): Triangle[] {
	const coords: number[] = points.map(p => [nth_elem(p, 0), nth_elem(p, 1)]).flat();
	const delaunay: Delaunator<number[]> = new Delaunator(coords);
	const tris: Triangle[] = [];
	for (let i=0; i< delaunay.triangles.length; i+=3) {
		tris.push(<Triangle>{
			iV1: delaunay.triangles[i + 0],
			iV2: delaunay.triangles[i + 1],
			iV3: delaunay.triangles[i + 2],
			// iN12: delaunay.halfedges
			// TODO edges if needed
		});
	}
	return tris;
}
