import { Plane } from "./plane";
import { Vector } from "./vector";

/**
 * Tests intersection between a ray (defined by a start point and a direction vector) and a plane.
 * Returns a vector if the ray intersects the plane, and null if it's parallel.
 * If the ray intersected the plane, the returned vector's xyz represent the point in space where the
 * ray intersects the plane, and its w component is the distance from start to the instersection point - positive
 * if the intersection is ahead of start, and negative if it's behind it.
 */
export function rayIntersectPlane(start: Vector, dir: Vector, plane: Plane): Vector | null {
	const grad: number = plane.normal().dot(dir);
	if (Math.abs(grad) <= Number.EPSILON) {
		return null;
	}
	const t = (-plane.d - plane.normal().dot(start)) / grad; // ray parameter t for intersection between ray and plane
	const point: Vector = start.add(dir.scale(t));
	point.w = t;
	return point;
}

/**
 * Computes the intersection point between a ray and a triangle.
 * Returns null if the ray doesn't intersect the triangle.
 */
export function rayIntersectTri(start: Vector, dir: Vector, p1: Vector, p2: Vector, p3: Vector): Vector {
	const p1p3: Vector = p3.sub(p1);
	const p1p2: Vector = p2.sub(p1);
	const triNorm: Vector = p1p2.cross(p1p3).normalize(); // triangle normal
	const d: number = -triNorm.dot(p1); // d component of plane equation (triNorm has a,b,c)

	const I: Vector | null = rayIntersectPlane(start, dir, new Plane(triNorm.x, triNorm.y, triNorm.z, d));
	if (!I) {
		return null; // ray is parallel to triangle's plane
	}
	const t = I.w; // ray parameter t for intersection between ray and triangle plane
	if (t < 0) {
		// t<0 means intersection point is behind start
		return null;
	}

	const intersectionPoint: Vector = I.xyz(); // this is the point in the triangle's plane where the ray hits
	const p1P: Vector = intersectionPoint.sub(p1);
	// now check if the point is within the triangle
	const d00: number = p1p3.dot(p1p3);
	const d01: number = p1p2.dot(p1p3);
	const d02: number = p1p3.dot(p1P);
	const d11: number = p1p2.dot(p1p2);
	const d12: number = p1p2.dot(p1P);
	const invDenom = 1 / (d00 * d11 - d01 * d01);
	// compute barycentric coords:
	const u: number = (d11 * d02 - d01 * d12) * invDenom;
	const v: number = (d00 * d12 - d01 * d02) * invDenom;

	if (u >= 0 && v >= 0 && u + v <= 1) {
		return intersectionPoint;
	} else {
		return null;
	}
}

/**
 * Casts a ray from the box's center in the given direction and returns the coordinates of the point
 * on the edge of the box that is intersected by the ray
 * length is along OX axis, and width along OY. direction is relative to trigonometric zero (OX+)
 */
export function rayIntersectBox(length: number, width: number, direction: number): Vector {
	throw new Error("not implemented");
	// float hw = width * 0.5f, hl = length * 0.5f;	// half width and length
	// // bring the angle between [-PI, +PI]
	// float phiQ = atanf(width/length);
	// float relativeAngle = limitAngle(direction, 2*PI-phiQ);
	// if (relativeAngle < phiQ) {
	// 	// front edge
	// 	glm::vec2 ret(hl, sinf(relativeAngle) * hw);
	// 	return ret;
	// } else if (relativeAngle < PI-phiQ  || relativeAngle > PI+phiQ) {
	// 	// left or right edge
	// 	glm::vec2 ret(cosf(relativeAngle) * hl, relativeAngle < PI ? hw : -hw);
	// 	return ret;
	// } else {
	// 	// back edge
	// 	glm::vec2 ret(-hl, sinf(relativeAngle) * hw);
	// 	return ret;
	// }
}

// export function rayIntersectSphere() {
// 	// sphere equation is (x-cx)^2 + (y-cy)^2 + (z-cz)^2 = R^2
// 	// ray equation is (x,y,z) = pos + t*dir
// 	// from these two we obtain a 2nd degree algebraic equation with variable t and factors a,b,c
// 	vec3 M = r.pos - s.center;
// 	float a = dot(r.dir, r.dir);
// 	float b = 2 * dot(M, r.dir);
// 	float c = dot(M, M) - pow(s.radius, 2);

// 	float delta = pow(b, 2) - 4*a*c;
// 	if (delta <= 0) {
// 		// delta < 0 -> no solutions means no intersection
// 		// delta == 0 means tangent intersection which we discard
// 		return {false};
// 	}
// 	// two solutions corresponding to entrance and exit, we take the closer one (or the only one in front if we're inside the sphere)
// 	float rd = sqrt(delta);
// 	float t1 = (-b + rd) / (2*a);
// 	float t2 = (-b - rd) / (2*a);
// 	float t = min(t1, t2);
// 	if (t < 0)
// 		t = max(t1, t2);
// 	vec3 point = r.pos + r.dir * t;
// 	vec3 normal = normalize(point - s.center);
// 	return {true, point, t, normal, &s.material};
// }
