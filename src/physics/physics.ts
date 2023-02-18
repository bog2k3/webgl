import Ammo from "ammojs-typed";
import { buildPhysDebugDrawer, PhysDebugDrawModes } from "./phys-debug-drawer";

// export let physics: typeof Ammo = null;
export let physWorld: Ammo.btDiscreteDynamicsWorld = null;
let debugDrawer: Ammo.DebugDrawer = null;

export async function initPhysics(): Promise<void> {
	await Ammo(Ammo);
	// collision configuration contains default setup for memory , collision setup . Advanced users can create their own configuration .
	const collisionConfig = new Ammo.btDefaultCollisionConfiguration();
	// use the default collision dispatcher . For parallel processing you can use a diffent dispatcher ( see Extras / BulletMultiThreaded )
	const dispatcher = new Ammo.btCollisionDispatcher(collisionConfig);
	// btDbvtBroadphase is a good general purpose broadphase . You can also try out btAxis3Sweep
	const broadphase = new Ammo.btDbvtBroadphase();
	// the default constraint solver . For parallel processing you can use a different solver ( see Extras / BulletMultiThreaded )
	const solver = new Ammo.btSequentialImpulseConstraintSolver();
	physWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfig);
	physWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));

	setPhysicsDebugDrawer(buildPhysDebugDrawer());
}

export function setPhysicsDebugDrawer(debugDrawer_: Ammo.btIDebugDraw | null): void {
	debugDrawer = debugDrawer_;
	physWorld.setDebugDrawer(debugDrawer);
}

export function setPhysicsDebugDrawMode(mode: PhysDebugDrawModes & number) {
	if (!debugDrawer) {
		throw new Error("Debug draw not enabled (pass enableDebugDraw: true to initPhysics())");
	}
	debugDrawer.setDebugMode(mode);
}
