import Ammo from "ammojs-typed";
import { assert } from "../joglfw/utils/assert";
import { IUpdatable } from "../joglfw/world/updateable";
import { bullet2Vec } from "./functions";
import { CollisionEvent, ContactPoint, PhysBodyProxy } from "./phys-body-proxy";
import { physWorld } from "./physics";

export class CollisionChecker implements IUpdatable {
	update(dt: number): void {
		// Browse all collision pairs
		const numManifolds = physWorld.getDispatcher().getNumManifolds();
		for (let i = 0; i < numManifolds; i++) {
			const contactManifold = physWorld.getDispatcher().getManifoldByIndexInternal(i);
			const pMetaA = <PhysBodyProxy>(
				(Ammo as any).castObject(contactManifold.getBody0(), Ammo.btRigidBody).proxyPtr
			);
			const pMetaB = <PhysBodyProxy>(
				(Ammo as any).castObject(contactManifold.getBody1(), Ammo.btRigidBody).proxyPtr
			);

			assert(
				pMetaA != null || pMetaB !== null,
				"Some btCollisionObject in the world doesn't contain a PhysBodyProxy user pointer",
			);

			// each one of objects A and B treats its collision events differently
			if (pMetaA.collisionCfg[pMetaB.entityType]) {
				this.checkCollision(pMetaA, pMetaB, contactManifold, false);
			}
			if (pMetaB.collisionCfg[pMetaA.entityType]) {
				this.checkCollision(pMetaB, pMetaA, contactManifold, true);
			}
		}
	}

	checkCollision(
		pA: PhysBodyProxy,
		pB: PhysBodyProxy,
		contactManifold: Ammo.btPersistentManifold,
		reverse: boolean,
	): void {
		const ev = new CollisionEvent();
		ev.thisObj = contactManifold.getBody0();
		ev.otherObj = contactManifold.getBody1();
		if (reverse) {
			[ev.thisObj, ev.otherObj] = [ev.otherObj, ev.thisObj];
		}
		ev.thisMeta = pA;
		ev.otherMeta = pB;
		const numContacts = Math.min(contactManifold.getNumContacts(), CollisionEvent.maxNumberContacts);
		// Check all contacts points
		for (let i = 0; i < numContacts; i++) {
			const pt = contactManifold.getContactPoint(i);
			if (pt.getDistance() < 0) {
				let ptA: Ammo.btVector3 = pt.getPositionWorldOnA();
				let ptB: Ammo.btVector3 = pt.getPositionWorldOnB();
				if (reverse) {
					[ptA, ptB] = [ptB, ptA];
				}
				const normalOnB: Ammo.btVector3 = reverse ? null : pt.get_m_normalWorldOnB();
				ev.contacts.push(<ContactPoint>{
					worldPointOnThis: bullet2Vec(ptA),
					worldPointOnOther: bullet2Vec(ptB),
					worldNormalOnOther: bullet2Vec(normalOnB),
				});
			}
		}
		if (numContacts) pA.onCollision.trigger(ev);
	}
}
