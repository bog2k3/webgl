import Ammo from "ammojs-typed";
import { Quat } from "../joglfw/math/quat";
import { Vector } from "../joglfw/math/vector";

export function vec2Bullet(vec: Vector): Ammo.btVector3 {
	return new Ammo.btVector3(vec.x, vec.y, vec.z);
}

export function quat2Bullet(q: Quat): Ammo.btQuaternion {
	return new Ammo.btQuaternion(q.x, q.y, q.z, q.w);
}

export function bullet2Vec(v: Ammo.btVector3): Vector {
	return new Vector(v.x(), v.y(), v.z());
}

export function bullet2Quat(q: Ammo.btQuaternion): Quat {
	return new Quat(q.x(), q.y(), q.z(), q.w());
}
