import Ammo from "ammojs-typed";
import { logprefix } from "../joglfw/log";

logprefix("PhysDebugDraw");

export class PhysDebugDrawer extends Ammo.btIDebugDraw {
	override drawLine(from: Ammo.btVector3, to: Ammo.btVector3, color: Ammo.btVector3): void {
		Shape3D::get()->drawLine(b2g(from), b2g(to), b2g(color));
	}

	override drawContactPoint(
		pointOnB: Ammo.btVector3,
		normalOnB: Ammo.btVector3,
		distance: number,
		lifeTime: number,
		color: Ammo.btVector3,
	): void {
		// TODO: use lifetime for alpha?
		Shape3D::get()->drawLine(b2g(PointOnB), b2g(PointOnB+normalOnB * distance), glm::vec4(b2g(color), 1.f));
	}

	override reportErrorWarning(warningString: string): void {
		console.log("AMMO WARNING: ", warningString);
	}

	override draw3dText(location: Ammo.btVector3, textString: string): void {
		// TODO
	}

	override setDebugMode(debugMode: number): void {
		this.debugMode = debugMode;
	}

	override getDebugMode(): number {
		return this.debugMode;
	}

	private debugMode =
		PhysDebugDrawModes.DBG_DrawWireframe |
		PhysDebugDrawModes.DBG_DrawContactPoints |
		PhysDebugDrawModes.DBG_DrawConstraints |
		PhysDebugDrawModes.DBG_DrawNormals;
}

export enum PhysDebugDrawModes {
	DBG_NoDebug = 0,
	DBG_DrawWireframe = 1,
	DBG_DrawAabb = 2,
	DBG_DrawFeaturesText = 4,
	DBG_DrawContactPoints = 8,
	DBG_NoDeactivation = 16,
	DBG_NoHelpText = 32,
	DBG_DrawText = 64,
	DBG_ProfileTimings = 128,
	DBG_EnableSatComparison = 256,
	DBG_DisableBulletLCP = 512,
	DBG_EnableCCD = 1024,
	DBG_DrawConstraints = 1 << 11,
	DBG_DrawConstraintLimits = 1 << 12,
	DBG_FastWireframe = 1 << 13,
	DBG_DrawNormals = 1 << 14,
	DBG_DrawFrames = 1 << 15,
}
