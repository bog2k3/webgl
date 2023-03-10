import { Vector } from "./vector";

export class Plane {
	/** Constructs a plane satisfying this formula:
	 * ax + by + cz + d = 0
	 */
	constructor(public a: number, public b: number, public c: number, public d: number) {}

	/** Constructs a plane from 3 points. The points are assumed to be clockwise when looking at the positive side of the plane */
	static fromPoints(p1: Vector, p2: Vector, p3: Vector): Plane {
		const n: Vector = p2.sub(p1).cross(p3.sub(p1)).normalize();
		const d = -p1.dot(n);
		return new Plane(n.x, n.y, n.z, d);
	}

	/** Returns the distance from a point v to this plane.
	 * The distance is positive if the point is on the positive side of the plane, negative if it's on the negative side,
	 * and zero if the point lies on the plane.
	 */
	pointDistance(v: Vector): number {
		return this.a * v.x + this.b * v.y + this.c * v.z + this.d;
	}

	/** returns the normal vector of this plane (pointing out of the positive side) */
	normal(): Vector {
		return new Vector(this.a, this.b, this.c);
	}
}
