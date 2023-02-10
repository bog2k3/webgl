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


// // Perform Delaunay triangulation of a set of points.
// // returns 1 on success, negative error code on error.
// // input: [points] array of points
// // output: [triangles] vector of Triangle structure that describes the indexes of each vertex of each triangle and the index of the neighbour Triangle at each side
// export function triangulate<VERTEX_TYPE>(points: VERTEX_TYPE[], nth_elem: NTH_ELEM_FN<VERTEX_TYPE>, out_triangles: Triangle[]): number {
// 	const vshx: Shx[] = new Array(points.length);
// 	for (let i=0; i<points.length; i++) {
// 		vshx[i] = new Shx(nth_elem(points[i], 0), nth_elem(points[i], 1));
// 		vshx[vshx.length-1].id = i;
// 	}
// 	const triads: Triad[] = [];
// 	const ret: number = triangulateImpl(vshx, triads);
// 	if (ret < 0)
// 		return ret;
// 	// populate out_triangles vec
// 	out_triangles.splice(0);
// 	for (const t of triads) {
// 		out_triangles.push(<Triangle>{
// 			iN12: Math.floor(t.a),
// 			iN13: Math.floor(t.b),
// 			iN23: Math.floor(t.c),
// 			iV1: t.ab,
// 			iV2: t.ac,
// 			iV3: t.bc
// 		});
// 	}
// 	return ret;
// }



// // -------------- IMPLEMENTATION DETAILS FOLLOW -------------------------- //

// class Triad {
// 	a: number;
// 	b: number;
// 	c: number;
// 	ab: number;
// 	bc: number;
// 	ac: number;  // adjacent edges index to neighbouring triangle.
// 	ro: number;
// 	R: number;
// 	C: number;

// 	constructor(x: number, y: number, z: number = 0) {
// 		this.a = x;
// 		this.b = y;
// 		this.c = z;
// 		this.ab = -1;
// 		this.bc = -1;
// 		this.ac = -1;
// 		this.ro = -1;
// 		this.R = 0;
// 		this.C = 0;
// 	}
// };


// /* point structure for triangulate.
//    has to keep track of triangle ids as hull evolves.
// */
// class Shx {
// 	id: number;
// 	trid: number;
// 	r: number;
// 	c: number;
// 	tr: number;
// 	tc: number;
// 	ro: number;

// 	constructor(a: number, b: number, x: number = 0) {
// 		this.id = -1;
// 		this.trid = -1;
// 		this.r = a;
// 		this.c = b;
// 		this.tr = 0;
// 		this.tc = 0;
// 		this.ro = x;
// 	}
// };

// // sort into descending order (for use in corner responce ranking).
// function Shx_lessThan(a: Shx, b: Shx): number {
// 	if (a.ro == b.ro) {
// 		if (a.r == b.r) {
// 			return a.c - b.c;
// 		}
// 		return a.r - b.r;
// 	}
// 	return a.ro - b.ro;
// }

// //  version in which the ids of the triangles associated with the sides of the hull are tracked.
// function triangulateImpl(pts: Shx[], triads: Triad[]): number {
// 	let nump = pts.length;

// 	if( nump < 3 ){
// 	  //cerr << "less than 3 points, aborting " << endl;
// 	  return(-1);
// 	}


// 	let r = pts[0].r;
// 	let c = pts[0].c;
// 	for( let k=0; k<nump; k++){
// 	  let dr = pts[k].r-r;
// 	  let dc = pts[k].c-c;

// 	  pts[k].ro = dr*dr + dc*dc;

// 	}

// 	pts.sort(Shx_lessThan);

// 	let r1 = pts[0].r;
// 	let c1 = pts[0].c;

// 	let r2 = pts[1].r;
// 	let c2 = pts[1].c;
// 	let mid = -1;
// 	let romin2 =  9.0e20, ro2, R,C;

// 	let k=2;
// 	while (k<nump){

// 	  [r, c, ro2] = circle_cent2(r1,c1,r2,c2,  pts[k].r,  pts[k].c);
// 	  if( ro2 < romin2 && ro2 > 0 ){
// 		mid = k;
// 		romin2 = ro2;
// 		R = r;
// 		C = c;

// 	  }
// 	  else if( romin2 *4 < pts[k].ro )
// 		k=nump;

// 	  k++;
// 	}

// 	if( mid < 0 ){
// 	  //cerr << "linear structure, aborting " << endl;
// 	  return(-2);
// 	}


// 	const pt0 = {...pts[0]};
// 	const pt1 = {...pts[1]};
// 	const pt2 = {...pts[mid]};

// 	let ptest = test_center(pt0, pt1, pt2 );
// 	if( ptest < 0 ){
// 	  //cerr << "warning: obtuce seed triangle sellected " << endl;
// 	}


// 	pts.splice(mid, 1);  // necessary for round off reasons:((((((
// 	pts.splice(0, 1);
// 	pts.splice(0, 1);

// 	 for( let k=0; k<nump-3; k++){
// 	  let dr = pts[k].r-R;
// 	  let dc = pts[k].c-C;

// 	  pts[k].ro = dr*dr + dc*dc;

// 	}

// 	pts.sort(Shx_lessThan);

// 	pts.splice(0, 0, {...pt2});
// 	pts.splice(0, 0, {...pt1});
// 	pts.splice(0, 0, {...pt0});

// 	const slump: number[] = new Array[nump];

// 	for( let k=0; k<nump; k++){
// 	  if( pts[k].id < nump) {
// 		slump[ pts[k].id] = k;
// 	  }
// 	  else{
// 		let mx = pts[k].id+1;
// 		while( slump.length <= mx){
// 	  		slump.push(0);
// 		}
// 		slump[pts[k].id] = k;
// 	  }
// 	}

// 	const hull: Shx[] = [];

// 	r = (pts[0].r + pts[1].r + pts[2].r ) / 3.0;
// 	c = (pts[0].c + pts[1].c + pts[2].c ) / 3.0;

// 	let dr0 = pts[0].r - r,  dc0 = pts[0].c - c;
// 	let tr01 =  pts[1].r - pts[0].r, tc01 =  pts[1].c - pts[0].c;

// 	let df = -tr01* dc0 + tc01*dr0;
// 	if( df < 0 ){   // [ 0 1 2 ]
// 	  pt0.tr = pt1.r-pt0.r;
// 	  pt0.tc = pt1.c-pt0.c;
// 	  pt0.trid = 0;
// 	  hull.push( {...pt0} );

// 	  pt1.tr = pt2.r-pt1.r;
// 	  pt1.tc = pt2.c-pt1.c;
// 	  pt1.trid = 0;
// 	  hull.push( {...pt1} );

// 	  pt2.tr = pt0.r-pt2.r;
// 	  pt2.tc = pt0.c-pt2.c;
// 	  pt2.trid = 0;
// 	  hull.push( {...pt2} );

// 	  const tri = new Triad(pt0.id,pt1.id,pt2.id);
// 	  tri.ro = romin2;
// 	  tri.R = R;
// 	  tri.C = C;

// 	  triads.push(tri);

// 	}
// 	else{          // [ 0 2 1 ] as anti-clockwise turning is the work of the devil....
// 	  pt0.tr = pt2.r-pt0.r;
// 	  pt0.tc = pt2.c-pt0.c;
// 	  pt0.trid = 0;
// 	  hull.push( pt0 );

// 	  pt2.tr = pt1.r-pt2.r;
// 	  pt2.tc = pt1.c-pt2.c;
// 	  pt2.trid = 0;
// 	  hull.push( pt2 );

// 	  pt1.tr = pt0.r-pt1.r;
// 	  pt1.tc = pt0.c-pt1.c;
// 	  pt1.trid = 0;
// 	  hull.push( pt1 );

// 	  const tri = new Triad(pt0.id,pt2.id,pt1.id);
// 	  tri.ro = romin2;
// 	  tri.R = R;
// 	  tri.C = C;
// 	  triads.push(tri);
// 	}

// 	// add new points into hull (removing obscured ones from the chain)
// 	// and creating triangles....
// 	// that will need to be flipped.

// 	let dr, dc, rx, cx: number;
// 	let ptx: Shx;
// 	let numt: number;

// 	//  write_Triads(triads, "rose_0.mat");

// 	for( let k=3; k<nump; k++){
// 	  rx = pts[k].r;    cx = pts[k].c;
// 	  ptx.r = rx;
// 	  ptx.c = cx;
// 	  ptx.id = pts[k].id;

// 	  let numh = hull.length;//, numh_old = numh;
// 	  dr = rx- hull[0].r;    dc = cx- hull[0].c;  // outwards pointing from hull[0] to pt.

// 	  const pidx: number[] = [];
// 	  const tridx: number[] = [];
// 	  let hidx: number;  // new hull polet location within hull.....


// 	  let df = -dc* hull[0].tr + dr*hull[0].tc;    // visibility test vector.
// 	  if( df < 0 ){  // starting with a visible hull facet !!!
// 		//let e1 = 1, e2 = numh;
// 		hidx = 0;

// 		// check to see if segment numh is also visible
// 		df = -dc* hull[numh-1].tr + dr*hull[numh-1].tc;
// 		//cerr << df << ' ' ;
// 		if( df < 0 ){    // visible.
// 	  pidx.push(hull[numh-1].id);
// 	  tridx.push(hull[numh-1].trid);


// 	  for( let h=0; h<numh-1; h++){
// 		// if segment h is visible delete h
// 		dr = rx- hull[h].r;    dc = cx- hull[h].c;
// 		df = -dc* hull[h].tr + dr*hull[h].tc;
// 		pidx.push(hull[h].id);
// 		tridx.push(hull[h].trid);
// 		if( df < 0 ){
// 		  hull.splice(h, 1);
// 		  h--;
// 		  numh--;
// 		}
// 		else{	  // quit on invisibility
// 		  ptx.tr = hull[h].r - ptx.r;
// 		  ptx.tc = hull[h].c - ptx.c;

// 		  hull.splice( 0, 0, {...ptx});
// 		  numh++;
// 		  break;
// 		}
// 	  }
// 	  // look backwards through the hull structure.

// 	  for( let h=numh-2; h>0; h--){
// 		// if segment h is visible delete h + 1
// 		dr = rx- hull[h].r;    dc = cx- hull[h].c;
// 		df = -dc* hull[h].tr + dr*hull[h].tc;

// 		if( df < 0 ){  // h is visible
// 		  pidx.splice(0, 0, hull[h].id);
// 		  tridx.splice(0, 0, hull[h].trid);
// 		  hull.splice(h+1, 1);  // erase end of chain

// 		}
// 		else{

// 		  h = hull.length-1;
// 		  hull[h].tr = -hull[h].r + ptx.r;   // points at start of chain.
// 		  hull[h].tc = -hull[h].c + ptx.c;
// 		  break;
// 		}
// 	  }

// 	  df = 9;

// 		}
// 		else{
// 	  //	cerr << df << ' ' << endl;
// 	  hidx = 1;  // keep pt hull[0]
// 	  tridx.push(hull[0].trid);
// 	  pidx.push(hull[0].id);

// 	  for( let h=1; h<numh; h++){
// 		// if segment h is visible delete h
// 		dr = rx- hull[h].r;    dc = cx- hull[h].c;
// 		df = -dc* hull[h].tr + dr*hull[h].tc;
// 		pidx.push(hull[h].id);
// 		tridx.push(hull[h].trid);
// 		if( df < 0 ){                     // visible
// 		  hull.splice(h, 1);
// 		  h--;
// 		  numh--;
// 		}
// 		else{	  // quit on invisibility
// 		  ptx.tr = hull[h].r - ptx.r;
// 		  ptx.tc = hull[h].c - ptx.c;

// 		  hull[h-1].tr = ptx.r - hull[h-1].r;
// 		  hull[h-1].tc = ptx.c - hull[h-1].c;

// 		  hull.splice( h, 0, ptx);
// 		  break;
// 		}
// 	  }
// 		}

// 		df = 8;

// 	  }
// 	  else{
// 		let e1 = -1,  e2 = numh;
// 		for( let h=1; h<numh; h++){
// 	  dr = rx- hull[h].r;    dc = cx- hull[h].c;
// 	  df = -dc* hull[h].tr + dr*hull[h].tc;
// 	  if( df < 0 ){
// 		if( e1 < 0 ) e1 = h;  // fist visible
// 	  }
// 	  else{
// 		if( e1 > 0 ){ // first invisible segment.
// 		  e2 = h;
// 		  break;
// 		}
// 	  }

// 		}


// 		// triangle pidx starts at e1 and ends at e2 (inclusive).
// 		if( e2 < numh ){
// 	  for( let e=e1; e<=e2; e++){
// 		pidx.push(hull[e].id);
// 		tridx.push(hull[e].trid);
// 	  }
// 		}
// 		else{
// 	  for( let e=e1; e<e2; e++){
// 		pidx.push(hull[e].id);
// 		tridx.push(hull[e].trid);   // there are only n-1 triangles from n hull pts.
// 	  }
// 	  pidx.push(hull[0].id);
// 		}


// 		// erase elements e1+1 : e2-1 inclusive.

// 		if( e1 < e2-1){
// 	  		hull.splice(e1+1, e2 - e1 - 1);
// 		}

// 		// insert ptx at location e1+1.
// 		if( e2 == numh){
// 	  ptx.tr = hull[0].r - ptx.r;
// 	  ptx.tc = hull[0].c - ptx.c;
// 		}
// 		else{
// 	  ptx.tr = hull[e1+1].r - ptx.r;
// 	  ptx.tc = hull[e1+1].c - ptx.c;
// 		}

// 		hull[e1].tr = ptx.r - hull[e1].r;
// 		hull[e1].tc = ptx.c - hull[e1].c;

// 		hull.splice( e1+1, 0, ptx);
// 		hidx = e1+1;

// 	  }


// 	  let a = ptx.id, T0;
// 	  const trx = new Triad( a, 0,0);
// 	  r1 = pts[slump[a]].r;
// 	  c1 = pts[slump[a]].c;

// 	  let npx = pidx.length-1;
// 	  numt = triads.length;
// 	  T0 = numt;

// 	  if( npx == 1){
// 		 trx.b = pidx[0];
// 		 trx.c = pidx[1];

// 		trx.bc = tridx[0];
// 		trx.ab = -1;
// 		trx.ac = -1;

// 		// index back into the triads.
// 		const txx: Triad = triads[tridx[0]];
// 		if( ( trx.b == txx.a && trx.c == txx.b) || ( trx.b == txx.b && trx.c == txx.a)) {
// 	  txx.ab = numt;
// 		}
// 		else if( ( trx.b == txx.a && trx.c == txx.c) || ( trx.b == txx.c && trx.c == txx.a)) {
// 	  txx.ac = numt;
// 		}
// 		else if( ( trx.b == txx.b && trx.c == txx.c) || ( trx.b == txx.c && trx.c == txx.b)) {
// 	  txx.bc = numt;
// 		}


// 		hull[hidx].trid = numt;
// 		if( hidx > 0 )
// 	  hull[hidx-1].trid = numt;
// 		else{
// 	  numh = hull.length;
// 	  hull[numh-1].trid = numt;
// 		}
// 		triads.push( {...trx} );
// 		numt++;
// 	  }

// 	  else{
// 		trx.ab = -1;
// 		for(let p=0; p<npx; p++){
// 	  trx.b = pidx[p];
// 	  trx.c = pidx[p+1];


// 	  trx.bc = tridx[p];
// 	  if( p > 0 )
// 		trx.ab = numt-1;
// 	  trx.ac = numt+1;

// 	  // index back into the triads.
// 	  const txx: Triad = triads[tridx[p]];
// 	  if( ( trx.b == txx.a && trx.c == txx.b) || ( trx.b == txx.b && trx.c == txx.a)) {
// 		txx.ab = numt;
// 	  }
// 	  else if( ( trx.b == txx.a && trx.c == txx.c) || ( trx.b == txx.c && trx.c == txx.a)) {
// 		txx.ac = numt;
// 	  }
// 	  else if( ( trx.b == txx.b && trx.c == txx.c) || ( trx.b == txx.c && trx.c == txx.b)) {
// 		txx.bc = numt;
// 	  }

// 	  triads.push( trx );
// 	  numt++;
// 		}
// 		triads[numt-1].ac=-1;

// 		hull[hidx].trid = numt-1;
// 		if( hidx > 0 )
// 	  hull[hidx-1].trid = T0;
// 		else{
// 	  numh = hull.length;
// 	  hull[numh-1].trid = T0;
// 		}


// 	  }

// 	  /*
// 	   char tname[128];
// 	   sprintf(tname,"rose_%d.mat",k);
// 	   write_Triads(triads, tname);
// 	   let dbgb = 0;
// 	  */

// 	}

// 	//cerr << "of triangles " << triads.length << " to be flipped. "<< endl;

// 	//  write_Triads(triads, "tris0.mat");

// 	let ids: number[] = [];
// 	let ids2: number[] = [];

// 	let tf = T_flip_pro( pts, triads, slump, numt, 0, ids);
// 	if( tf < 0 ){
// 	  //cerr << "cannot triangualte this set " << endl;

// 	  return(-3);
// 	}

// 	//  write_Triads(triads, "tris1.mat");

// 	// cerr << "n-ids " << ids.length << endl;


// 	let nits = ids.length, nit=1;
// 	while(  nits > 0 && nit < 50){

// 	  tf = T_flip_pro_idx( pts, triads, slump, ids, ids2);
// 	  nits = ids2.length;
// 	  const tmp = ids;
// 	  ids = ids2;
// 	  ids2 = tmp;

// 	  // cerr << "flipping cycle  " << nit << "   active triangles " << nits << endl;

// 	  nit ++;
// 	  if( tf < 0 ){
// 		//cerr << "cannot triangualte this set " << endl;

// 		return(-4);
// 	  }
// 	}

// 	ids.splice(0);
// 	nits = T_flip_edge( pts, triads, slump, numt, 0, ids);
// 	nit=0;


// 	while(  nits > 0 && nit < 100){

// 	  tf = T_flip_pro_idx( pts, triads, slump, ids, ids2);
// 	  const tmp = ids;
// 	  ids = ids2;
// 	  ids2 = tmp;

// 	  nits = ids.length;
// 	  //cerr << "flipping cycle  " << nit << "   active triangles " << nits << endl;

// 	  nit ++;
// 	  if( tf < 0 ){
// 		//cerr << "cannot triangualte this set " << endl;

// 		return(-4);
// 	  }
// 	}
// 	return(1);
// }

// function circle_cent2(r1: number,c1: number, r2: number,c2: number, r3: number,c3: number): number[] {
// 	let r, c, ro2;
// 	  /*
// 	   *  function to return the center of a circle and its radius
// 	   * degenerate case should never be passed to this routine!!!!!!!!!!!!!
// 	   * but will return r0 = -1 if it is.
// 	   */

// 	 let a1: number = (r1+r2)/2.0;
// 	 let a2: number = (c1+c2)/2.0;
// 	  let b1: number = (r3+r2)/2.0;
// 	 let b2: number = (c3+c2)/2.0;

// 	 let e2: number = r1-r2;
// 	  let e1: number = -c1+c2;

// 	 let q2: number = r3-r2;
// 	  let q1: number = -c3+c2;

// 	  r=0; c=0; ro2=-1;
// 	  if( e1*-q2 + e2*q1 == 0 ) return [r, c, ro2];

// 	  let beta: number = (-e2*(b1-a1) + e1*(b2-a2))/( e2*q1-e1*q2);

// 	  r = b1 + q1*beta;
// 	  c = b2 + q2*beta;

// 	  ro2 = (r1-r)*(r1-r) + (c1-c)*(c1-c);

// 	  return [r, c, ro2];
// }

// /* test the seed configuration to see if the center
//    of the circum circle lies inside the seed triangle.

//    if not issue a warning.
// */
// function test_center(pt0: Shx, pt1: Shx, pt2: Shx): number {

// 	let r01: number = pt1.r - pt0.r;
// 	let c01: number = pt1.c - pt0.c;

// 	let r02: number = pt2.r - pt0.r;
// 	let c02: number = pt2.c - pt0.c;

// 	let r21: number = pt1.r - pt2.r;
// 	let c21: number = pt1.c - pt2.c;

// 	let v: number = r01*r02 + c01*c02;
// 	if( v < 0 ) return(-1);

// 	v = r21*r02 + c21*c02;
// 	if( v > 0 ) return(-1);

// 	v = r01*r21 + c01*c21;
// 	if( v < 0 ) return(-1);

// 	return(1);
// }

// /*
//    flip pairs of triangles that are not valid delaunay triangles
//    the Cline-Renka test is used rather than the less stable circum
//    circle center computation test of s-hull.

//    or the more expensive determinant test.

//  */
// function T_flip_pro( pts: Shx[], triads: Triad[], slump: number[], numt: number, start: number, ids: number[]): number {

// 	let r3,c3;
//   	let pa,pb,pc, pd, D, L1, L2, L3, L4, T2;

//   	let tx: Triad;
// 	let tx2: Triad;


//   for( let t=start; t<numt; t++){

//     let tri: Triad = triads[t];
//     // test all 3 neighbours of tri

//     let flipped = 0;

//     if( tri.bc >= 0 ){

//       pa = slump[tri.a];
//       pb = slump[tri.b];
//       pc = slump[tri.c];

//       T2 = tri.bc;
//       let t2: Triad = triads[T2];
//       // find relative orientation (shared limb).
//       if( t2.ab == t ){
// 	D = t2.c;
// 	pd = slump[t2.c];

// 	if( tri.b == t2.a){
// 	  L3 = t2.ac;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ac;
// 	}
//       }
//       else if(  t2.ac == t ){
// 	D = t2.b;
// 	pd = slump[t2.b];

// 	if( tri.b == t2.a){
// 	  L3 = t2.ab;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ab;
// 	}
//       }
//       else if(  t2.bc == t ){
// 	D = t2.a;
// 	pd = slump[t2.a];

// 	if( tri.b == t2.b){
// 	  L3 = t2.ab;
// 	  L4 = t2.ac;
// 	}
// 	else{
// 	  L3 = t2.ac;
// 	  L4 = t2.ab;
// 	}
//       }
//       else{
// 	//cerr << "triangle flipping error. " << t << endl;
// 	return(-5);
//       }


//       //if( pd < 0 || pd > 100)
// 	//int dfx = 9;

//       r3 = pts[pd].r;
//       c3 = pts[pd].c;

//       const XX = Cline_Renka_test( pts[pa].r, pts[pa].c, pts[pb].r, pts[pb].c,
// 				  pts[pc].r, pts[pc].c, r3, c3 );

//       if( XX < 0 ){

// 	L1 = tri.ab;
// 	L2 = tri.ac;
//       	if( L1 != L3 && L2 != L4 ){  // need this check for stability.

// 	tx.a = tri.a;
// 	tx.b = tri.b;
// 	tx.c = D;

// 	tx.ab = L1;
// 	tx.ac = T2;
// 	tx.bc = L3;


// 	// triangle 2;
// 	tx2.a = tri.a;
// 	tx2.b = tri.c;
// 	tx2.c = D;

// 	tx2.ab = L2;
// 	tx2.ac = t;
// 	tx2.bc = L4;


// 	ids.push(t);
// 	ids.push(T2);

// 	t2 = tx2; // TODO perhaps we mean Object.assign()
// 	tri = tx;
// 	flipped = 1;

// 	// change knock on triangle labels.
// 	if( L3 >= 0 ){
// 	  let t3: Triad = triads[L3];
// 	  if( t3.ab == T2 ) t3.ab = t;
// 	  else if( t3.bc == T2 ) t3.bc = t;
// 	  else if( t3.ac == T2 ) t3.ac = t;
// 	}

// 	if(L2 >= 0 ){
// 	  let t4: Triad = triads[L2];
// 	  if( t4.ab == t ) t4.ab = T2;
// 	  else if( t4.bc == t ) t4.bc = T2;
// 	  else if( t4.ac == t ) t4.ac = T2;
// 	}
// 	}
//       }
//     }


//     if(  flipped == 0 && tri.ab >= 0 ){

//       pc = slump[tri.c];
//       pb = slump[tri.b];
//       pa = slump[tri.a];

//       T2 = tri.ab;
//       let t2 = triads[T2];
//       // find relative orientation (shared limb).
//       if( t2.ab == t ){
// 	D = t2.c;
// 	pd = slump[t2.c];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ac;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ac;
// 	}
//       }
//       else if(  t2.ac == t ){
// 	D = t2.b;
// 	pd = slump[t2.b];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ab;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ab;
// 	}
//       }
//       else if(  t2.bc == t ){
// 	D = t2.a;
// 	pd = slump[t2.a];

// 	if( tri.a == t2.b){
// 	  L3 = t2.ab;
// 	  L4 = t2.ac;
// 	}
// 	else{
// 	  L3 = t2.ac;
// 	  L4 = t2.ab;
// 	}
//       }
//       else{
// 	//cerr << "triangle flipping error. " << t << endl;
// 	return(-5);
//       }

//       r3 = pts[pd].r;
//       c3 = pts[pd].c;

//       const XX = Cline_Renka_test( pts[pc].r, pts[pc].c, pts[pb].r, pts[pb].c,
// 				  pts[pa].r, pts[pa].c,r3, c3);

//       if( XX < 0){


// 	L1 = tri.ac;
// 	L2 = tri.bc;
//       	if( L1 != L3 && L2 != L4 ){  // need this check for stability.

// 	tx.a = tri.c;
// 	tx.b = tri.a;
// 	tx.c = D;

// 	tx.ab = L1;
// 	tx.ac = T2;
// 	tx.bc = L3;


// 	// triangle 2;
// 	tx2.a = tri.c;
// 	tx2.b = tri.b;
// 	tx2.c = D;

// 	tx2.ab = L2;
// 	tx2.ac = t;
// 	tx2.bc = L4;


// 	ids.push(t);
// 	ids.push(T2);

// 	t2 = tx2;
// 	tri = tx;
// 	flipped = 1;

// 	// change knock on triangle labels.
// 	if( L3 >= 0 ){
// 	  let t3 = triads[L3];
// 	  if( t3.ab == T2 ) t3.ab = t;
// 	  else if( t3.bc == T2 ) t3.bc = t;
// 	  else if( t3.ac == T2 ) t3.ac = t;
// 	}

// 	if(L2 >= 0 ){
// 	  let t4 = triads[L2];
// 	  if( t4.ab == t ) t4.ab = T2;
// 	  else if( t4.bc == t ) t4.bc = T2;
// 	  else if( t4.ac == t ) t4.ac = T2;
// 	}

// 	}

//       }
//     }


//     if( flipped == 0 && tri.ac >= 0 ){

//       pc = slump[tri.c];
//       pb = slump[tri.b];
//       pa = slump[tri.a];

//       T2 = tri.ac;
//       let t2 = triads[T2];
//       // find relative orientation (shared limb).
//       if( t2.ab == t ){
// 	D = t2.c;
// 	pd = slump[t2.c];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ac;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ac;
// 	}
//       }
//       else if(  t2.ac == t ){
// 	D = t2.b;
// 	pd = slump[t2.b];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ab;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ab;
// 	}
//       }
//       else if(  t2.bc == t ){
// 	D = t2.a;
// 	pd = slump[t2.a];

// 	if( tri.a == t2.b){
// 	  L3 = t2.ab;
// 	  L4 = t2.ac;
// 	}
// 	else{
// 	  L3 = t2.ac;
// 	  L4 = t2.ab;
// 	}
//       }
//       else{
// 	//cerr << "triangle flipping error. " << t << endl;
// 	return(-5);
//       }

//       r3 = pts[pd].r;
//       c3 = pts[pd].c;

//       const XX = Cline_Renka_test( pts[pb].r, pts[pb].c, pts[pa].r, pts[pa].c,
// 				  pts[pc].r, pts[pc].c,r3, c3);

//       if( XX < 0 ){

// 	L1 = tri.ab;   // .ac shared limb
// 	L2 = tri.bc;
//       	if( L1 != L3 && L2 != L4 ){  // need this check for stability.

// 	tx.a = tri.b;
// 	tx.b = tri.a;
// 	tx.c = D;

// 	tx.ab = L1;
// 	tx.ac = T2;
// 	tx.bc = L3;


// 	// triangle 2;
// 	tx2.a = tri.b;
// 	tx2.b = tri.c;
// 	tx2.c = D;

// 	tx2.ab = L2;
// 	tx2.ac = t;
// 	tx2.bc = L4;

// 	ids.push(t);
// 	ids.push(T2);

// 	t2 = tx2;
// 	tri = tx;

// 	// change knock on triangle labels.
// 	if( L3 >= 0 ){
// 	  let t3 = triads[L3];
// 	  if( t3.ab == T2 ) t3.ab = t;
// 	  else if( t3.bc == T2 ) t3.bc = t;
// 	  else if( t3.ac == T2 ) t3.ac = t;
// 	}

// 	if(L2 >= 0 ){
// 	  let t4 = triads[L2];
// 	  if( t4.ab == t ) t4.ab = T2;
// 	  else if( t4.bc == t ) t4.bc = T2;
// 	  else if( t4.ac == t ) t4.ac = T2;
// 	}

// 	}
//       }
//     }


//   }


//   return(1);
// }


// // same again but with set of triangle ids to be iterated over.


// function T_flip_pro_idx( pts: Shx[], triads: Triad[], slump: number[], ids: number[], ids2: number[]): number {
//   let r3,c3;
//   let pa,pb,pc, pd,  D, L1, L2, L3, L4, T2;

//   let tx: Triad, tx2: Triad;
//   ids2.splice(0);
//   //std::vector<int> ids2;

//   let numi = ids.length;

//   for( let x=0; x<numi; x++){
//     let t = ids[x];


//     let tri = triads[t];
//     // test all 3 neighbours of tri
//     let flipped = 0;



//     if( tri.bc >= 0 ){

//       pa = slump[tri.a];
//       pb = slump[tri.b];
//       pc = slump[tri.c];

//       T2 = tri.bc;
//       let t2 = triads[T2];
//       // find relative orientation (shared limb).
//       if( t2.ab == t ){
// 	D = t2.c;
// 	pd = slump[t2.c];

// 	if( tri.b == t2.a){
// 	  L3 = t2.ac;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ac;
// 	}
//       }
//       else if(  t2.ac == t ){
// 	D = t2.b;
// 	pd = slump[t2.b];

// 	if( tri.b == t2.a){
// 	  L3 = t2.ab;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ab;
// 	}
//       }
//       else if(  t2.bc == t ){
// 	D = t2.a;
// 	pd = slump[t2.a];

// 	if( tri.b == t2.b){
// 	  L3 = t2.ab;
// 	  L4 = t2.ac;
// 	}
// 	else{
// 	  L3 = t2.ac;
// 	  L4 = t2.ab;
// 	}
//       }
//       else{
// 	//cerr << "triangle flipping error. " << t << "  T2: " <<  T2<<  endl;
// 	return(-6);
//       }

//       r3 = pts[pd].r;
//       c3 = pts[pd].c;

//       const XX = Cline_Renka_test( pts[pa].r, pts[pa].c, pts[pb].r, pts[pb].c,
// 				  pts[pc].r, pts[pc].c,r3, c3);

//       if( XX < 0 ){
// 	L1 = tri.ab;
// 	L2 = tri.ac;

// 	if( L1 != L3 && L2 != L4 ){  // need this check for stability.


// 	tx.a = tri.a;
// 	tx.b = tri.b;
// 	tx.c = D;

// 	tx.ab = L1;
// 	tx.ac = T2;
// 	tx.bc = L3;


// 	// triangle 2;
// 	tx2.a = tri.a;
// 	tx2.b = tri.c;
// 	tx2.c = D;

// 	tx2.ab = L2;
// 	tx2.ac = t;
// 	tx2.bc = L4;

// 	ids2.push(t);
// 	ids2.push(T2);

// 	t2 = tx2;
// 	tri = tx;
// 	flipped = 1;

// 	// change knock on triangle labels.
// 	if( L3 >= 0 ){
// 	  let t3 = triads[L3];
// 	  if( t3.ab == T2 ) t3.ab = t;
// 	  else if( t3.bc == T2 ) t3.bc = t;
// 	  else if( t3.ac == T2 ) t3.ac = t;
// 	}

// 	if(L2 >= 0 ){
// 	  let t4 = triads[L2];
// 	  if( t4.ab == t ) t4.ab = T2;
// 	  else if( t4.bc == t ) t4.bc = T2;
// 	  else if( t4.ac == t ) t4.ac = T2;
// 	}

// 	}
//       }
//     }


//     if( flipped == 0 && tri.ab >= 0 ){

//       pc = slump[tri.c];
//       pb = slump[tri.b];
//       pa = slump[tri.a];

//       T2 = tri.ab;
//       let t2 = triads[T2];
//       // find relative orientation (shared limb).
//       if( t2.ab == t ){
// 	D = t2.c;
// 	pd = slump[t2.c];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ac;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ac;
// 	}
//       }
//       else if(  t2.ac == t ){
// 	D = t2.b;
// 	pd = slump[t2.b];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ab;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ab;
// 	}
//       }
//       else if(  t2.bc == t ){
// 	D = t2.a;
// 	pd = slump[t2.a];

// 	if( tri.a == t2.b){
// 	  L3 = t2.ab;
// 	  L4 = t2.ac;
// 	}
// 	else{
// 	  L3 = t2.ac;
// 	  L4 = t2.ab;
// 	}
//       }
//       else{
// 	//cerr << "triangle flipping error. " << t <<  endl;
// 	return(-6);
//       }

//       r3 = pts[pd].r;
//       c3 = pts[pd].c;

//       const XX = Cline_Renka_test( pts[pc].r, pts[pc].c, pts[pb].r, pts[pb].c,
// 				  pts[pa].r, pts[pa].c,r3, c3);

//       if( XX < 0 ){
// 	L1 = tri.ac;
// 	L2 = tri.bc;
//       	if( L1 != L3 && L2 != L4 ){  // need this check for stability.

// 	tx.a = tri.c;
// 	tx.b = tri.a;
// 	tx.c = D;

// 	tx.ab = L1;
// 	tx.ac = T2;
// 	tx.bc = L3;


// 	// triangle 2;
// 	tx2.a = tri.c;
// 	tx2.b = tri.b;
// 	tx2.c = D;

// 	tx2.ab = L2;
// 	tx2.ac = t;
// 	tx2.bc = L4;


// 	ids2.push(t);
// 	ids2.push(T2);

// 	t2 = tx2;
// 	tri = tx;
// 	flipped = 1;

// 	// change knock on triangle labels.
// 	if( L3 >= 0 ){
// 	  let t3 = triads[L3];
// 	  if( t3.ab == T2 ) t3.ab = t;
// 	  else if( t3.bc == T2 ) t3.bc = t;
// 	  else if( t3.ac == T2 ) t3.ac = t;
// 	}

// 	if(L2 >= 0 ){
// 	  let t4 = triads[L2];
// 	  if( t4.ab == t ) t4.ab = T2;
// 	  else if( t4.bc == t ) t4.bc = T2;
// 	  else if( t4.ac == t ) t4.ac = T2;
// 	}

// 	}
//       }
//     }


//     if( flipped == 0 && tri.ac >= 0 ){

//       pc = slump[tri.c];
//       pb = slump[tri.b];
//       pa = slump[tri.a];

//       T2 = tri.ac;
//       let t2 = triads[T2];
//       // find relative orientation (shared limb).
//       if( t2.ab == t ){
// 	D = t2.c;
// 	pd = slump[t2.c];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ac;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ac;
// 	}
//       }
//       else if(  t2.ac == t ){
// 	D = t2.b;
// 	pd = slump[t2.b];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ab;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ab;
// 	}
//       }
//       else if(  t2.bc == t ){
// 	D = t2.a;
// 	pd = slump[t2.a];

// 	if( tri.a == t2.b){
// 	  L3 = t2.ab;
// 	  L4 = t2.ac;
// 	}
// 	else{
// 	  L3 = t2.ac;
// 	  L4 = t2.ab;
// 	}
//       }
//       else{
// 	//cerr << "triangle flipping error. " << t << endl;
// 	return(-6);
//       }

//       r3 = pts[pd].r;
//       c3 = pts[pd].c;

//       const XX = Cline_Renka_test( pts[pb].r, pts[pb].c, pts[pc].r, pts[pc].c,
// 				 pts[pa].r, pts[pa].c,r3, c3);

//       if( XX < 0 ){
// 	L1 = tri.ab;   // .ac shared limb
// 	L2 = tri.bc;
//       	if( L1 != L3 && L2 != L4 ){  // need this check for stability.


// 	tx.a = tri.b;
// 	tx.b = tri.a;
// 	tx.c = D;

// 	tx.ab = L1;
// 	tx.ac = T2;
// 	tx.bc = L3;


// 	// triangle 2;
// 	tx2.a = tri.b;
// 	tx2.b = tri.c;
// 	tx2.c = D;



// 	tx2.ab = L2;
// 	tx2.ac = t;
// 	tx2.bc = L4;


// 	ids2.push(t);
// 	ids2.push(T2);

// 	t2 = tx2;
// 	tri = tx;

// 	// change knock on triangle labels.
// 	if( L3 >= 0 ){
// 	  let t3 = triads[L3];
// 	  if( t3.ab == T2 ) t3.ab = t;
// 	  else if( t3.bc == T2 ) t3.bc = t;
// 	  else if( t3.ac == T2 ) t3.ac = t;
// 	}

// 	if(L2 >= 0 ){
// 	  let t4 = triads[L2];
// 	  if( t4.ab == t ) t4.ab = T2;
// 	  else if( t4.bc == t ) t4.bc = T2;
// 	  else if( t4.ac == t ) t4.ac = T2;
// 	}


// 	}
//       }
//     }
//   }

//   /*
//   if( ids2.size() > 5){
//     sort(ids2.begin(), ids2.end());
//     int nums = ids2.size();
//     int last = ids2[0], n=0;
//     ids3.push_back(last);
//     for(int g=1; g<nums; g++){
//       n = ids2[g];
//       if( n != last ){
// 	ids3.push_back(n);
// 	last = n;
//       }
//     }
//   }
//   else{
//     int nums = ids2.size();
//     for(int g=1; g<nums; g++){
//       ids3.push_back(ids2[g]);
//     }
//     } */


//   return(1);
// }

// function T_flip_edge( pts: Shx[], triads: Triad[], slump: number[], numt: number, start: number, ids: number[]): number {

// 	let r3,c3;
//   	let pa,pb,pc, pd, D, L1, L2, L3, L4, T2;

//   	let tx = new Triad(0, 0), tx2 = new Triad(0, 0);


//   for( let t=start; t<numt; t++){

//     let tri = triads[t];
//     // test all 3 neighbours of tri

//     let flipped = 0;

//     if( tri.bc >= 0  && (tri.ac < 0 || tri.ab < 0) ){

//       pa = slump[tri.a];
//       pb = slump[tri.b];
//       pc = slump[tri.c];

//       T2 = tri.bc;
//       let t2 = triads[T2];
//       // find relative orientation (shared limb).
//       if( t2.ab == t ){
// 	D = t2.c;
// 	pd = slump[t2.c];

// 	if( tri.b == t2.a){
// 	  L3 = t2.ac;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ac;
// 	}
//       }
//       else if(  t2.ac == t ){
// 	D = t2.b;
// 	pd = slump[t2.b];

// 	if( tri.b == t2.a){
// 	  L3 = t2.ab;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ab;
// 	}
//       }
//       else if(  t2.bc == t ){
// 	D = t2.a;
// 	pd = slump[t2.a];

// 	if( tri.b == t2.b){
// 	  L3 = t2.ab;
// 	  L4 = t2.ac;
// 	}
// 	else{
// 	  L3 = t2.ac;
// 	  L4 = t2.ab;
// 	}
//       }
//       else{
// 	//cerr << "triangle flipping error. " << t << endl;
// 	return(-5);
//       }


//       //if( pd < 0 || pd > 100)
// 	//int dfx = 9;

//       r3 = pts[pd].r;
//       c3 = pts[pd].c;

//       const XX = Cline_Renka_test( pts[pa].r, pts[pa].c, pts[pb].r, pts[pb].c,
// 				  pts[pc].r, pts[pc].c, r3, c3 );

//       if( XX < 0 ){

// 	L1 = tri.ab;
// 	L2 = tri.ac;
// 	//	if( L1 != L3 && L2 != L4 ){  // need this check for stability.

// 	tx.a = tri.a;
// 	tx.b = tri.b;
// 	tx.c = D;

// 	tx.ab = L1;
// 	tx.ac = T2;
// 	tx.bc = L3;


// 	// triangle 2;
// 	tx2.a = tri.a;
// 	tx2.b = tri.c;
// 	tx2.c = D;

// 	tx2.ab = L2;
// 	tx2.ac = t;
// 	tx2.bc = L4;


// 	ids.push(t);
// 	ids.push(T2);

// 	t2 = tx2;
// 	tri = tx;
// 	flipped = 1;

// 	// change knock on triangle labels.
// 	if( L3 >= 0 ){
// 	  let t3 = triads[L3];
// 	  if( t3.ab == T2 ) t3.ab = t;
// 	  else if( t3.bc == T2 ) t3.bc = t;
// 	  else if( t3.ac == T2 ) t3.ac = t;
// 	}

// 	if(L2 >= 0 ){
// 	  let t4 = triads[L2];
// 	  if( t4.ab == t ) t4.ab = T2;
// 	  else if( t4.bc == t ) t4.bc = T2;
// 	  else if( t4.ac == t ) t4.ac = T2;
// 	}
// 	//	}
//       }
//     }


//     if(  flipped == 0 && tri.ab >= 0  && (tri.ac < 0 || tri.bc < 0)){

//       pc = slump[tri.c];
//       pb = slump[tri.b];
//       pa = slump[tri.a];

//       T2 = tri.ab;
//       let t2 = triads[T2];
//       // find relative orientation (shared limb).
//       if( t2.ab == t ){
// 	D = t2.c;
// 	pd = slump[t2.c];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ac;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ac;
// 	}
//       }
//       else if(  t2.ac == t ){
// 	D = t2.b;
// 	pd = slump[t2.b];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ab;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ab;
// 	}
//       }
//       else if(  t2.bc == t ){
// 	D = t2.a;
// 	pd = slump[t2.a];

// 	if( tri.a == t2.b){
// 	  L3 = t2.ab;
// 	  L4 = t2.ac;
// 	}
// 	else{
// 	  L3 = t2.ac;
// 	  L4 = t2.ab;
// 	}
//       }
//       else{
// 	//cerr << "triangle flipping error. " << t << endl;
// 	return(-5);
//       }

//       r3 = pts[pd].r;
//       c3 = pts[pd].c;

//       const XX = Cline_Renka_test( pts[pc].r, pts[pc].c, pts[pb].r, pts[pb].c,
// 				  pts[pa].r, pts[pa].c,r3, c3);

//       if( XX < 0){


// 	L1 = tri.ac;
// 	L2 = tri.bc;
// 	//	if( L1 != L3 && L2 != L4 ){  // need this check for stability.

// 	tx.a = tri.c;
// 	tx.b = tri.a;
// 	tx.c = D;

// 	tx.ab = L1;
// 	tx.ac = T2;
// 	tx.bc = L3;


// 	// triangle 2;
// 	tx2.a = tri.c;
// 	tx2.b = tri.b;
// 	tx2.c = D;

// 	tx2.ab = L2;
// 	tx2.ac = t;
// 	tx2.bc = L4;


// 	ids.push(t);
// 	ids.push(T2);

// 	t2 = tx2;
// 	tri = tx;
// 	flipped = 1;

// 	// change knock on triangle labels.
// 	if( L3 >= 0 ){
// 	  let t3 = triads[L3];
// 	  if( t3.ab == T2 ) t3.ab = t;
// 	  else if( t3.bc == T2 ) t3.bc = t;
// 	  else if( t3.ac == T2 ) t3.ac = t;
// 	}

// 	if(L2 >= 0 ){
// 	  let t4 = triads[L2];
// 	  if( t4.ab == t ) t4.ab = T2;
// 	  else if( t4.bc == t ) t4.bc = T2;
// 	  else if( t4.ac == t ) t4.ac = T2;
// 	}

// 	//	}

//       }
//     }


//     if( flipped == 0 && tri.ac >= 0  && (tri.bc < 0 || tri.ab < 0) ){

//       pc = slump[tri.c];
//       pb = slump[tri.b];
//       pa = slump[tri.a];

//       T2 = tri.ac;
//       let t2 = triads[T2];
//       // find relative orientation (shared limb).
//       if( t2.ab == t ){
// 	D = t2.c;
// 	pd = slump[t2.c];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ac;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ac;
// 	}
//       }
//       else if(  t2.ac == t ){
// 	D = t2.b;
// 	pd = slump[t2.b];

// 	if( tri.a == t2.a){
// 	  L3 = t2.ab;
// 	  L4 = t2.bc;
// 	}
// 	else{
// 	  L3 = t2.bc;
// 	  L4 = t2.ab;
// 	}
//       }
//       else if(  t2.bc == t ){
// 	D = t2.a;
// 	pd = slump[t2.a];

// 	if( tri.a == t2.b){
// 	  L3 = t2.ab;
// 	  L4 = t2.ac;
// 	}
// 	else{
// 	  L3 = t2.ac;
// 	  L4 = t2.ab;
// 	}
//       }
//       else{
// 	//cerr << "triangle flipping error. " << t << endl;
// 	return(-5);
//       }

//       r3 = pts[pd].r;
//       c3 = pts[pd].c;

//       const XX = Cline_Renka_test( pts[pb].r, pts[pb].c, pts[pa].r, pts[pa].c,
// 				  pts[pc].r, pts[pc].c,r3, c3);

//       if( XX < 0 ){

// 	L1 = tri.ab;   // .ac shared limb
// 	L2 = tri.bc;
// 	//	if( L1 != L3 && L2 != L4 ){  // need this check for stability.

// 	tx.a = tri.b;
// 	tx.b = tri.a;
// 	tx.c = D;

// 	tx.ab = L1;
// 	tx.ac = T2;
// 	tx.bc = L3;


// 	// triangle 2;
// 	tx2.a = tri.b;
// 	tx2.b = tri.c;
// 	tx2.c = D;

// 	tx2.ab = L2;
// 	tx2.ac = t;
// 	tx2.bc = L4;

// 	ids.push(t);
// 	ids.push(T2);

// 	t2 = tx2;
// 	tri = tx;

// 	// change knock on triangle labels.
// 	if( L3 >= 0 ){
// 	  let t3 = triads[L3];
// 	  if( t3.ab == T2 ) t3.ab = t;
// 	  else if( t3.bc == T2 ) t3.bc = t;
// 	  else if( t3.ac == T2 ) t3.ac = t;
// 	}

// 	if(L2 >= 0 ){
// 	  let t4 = triads[L2];
// 	  if( t4.ab == t ) t4.ab = T2;
// 	  else if( t4.bc == t ) t4.bc = T2;
// 	  else if( t4.ac == t ) t4.ac = T2;
// 	}

// 	//}
//       }
//     }


//   }


//   return(1);
// }

// /* minimum angle cnatraint for circum circle test.
//    due to Cline & Renka

//    A   --    B

//    |    /    |

//    C   --    D


//  */

// function Cline_Renka_test(Ax: number, Ay: number,
// 		      Bx: number, By: number,
// 		      Cx: number, Cy: number,
// 		      Dx: number, Dy: number): number {

//   let v1x = Bx-Ax, v1y = By-Ay,    v2x = Cx-Ax, v2y = Cy-Ay,
//     v3x = Bx-Dx, v3y = By-Dy,    v4x = Cx-Dx, v4y = Cy-Dy;
//   let cosA = v1x*v2x + v1y*v2y;
//   let cosD = v3x*v4x + v3y*v4y;

//   if( cosA < 0 && cosD < 0 ) // two obtuse angles
//     return(-1);

//   //float ADX = Ax-Dx, ADy = Ay-Dy;


//   if( cosA > 0 && cosD > 0 )  // two acute angles
//     return(1);


//   let sinA = Math.abs(v1x*v2y - v1y*v2x);
//   let sinD = Math.abs(v3x*v4y - v3y*v4x);

//   if( cosA*sinD + sinA*cosD < 0 )
//     return(-1);

//   return(1);

// }

