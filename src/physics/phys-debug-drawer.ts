import Ammo from "ammojs-typed";
import { logprefix } from "../joglfw/log";
import { Vector } from "../joglfw/math/vector";
import { ShapeRenderer } from "../joglfw/render/shape-renderer";
import { bullet2Vec } from "./functions";

logprefix("PhysDebugDraw");

export function buildPhysDebugDrawer(): Ammo.DebugDrawer {
	let debugMode =
		PhysDebugDrawModes.DBG_DrawWireframe |
		PhysDebugDrawModes.DBG_DrawContactPoints |
		PhysDebugDrawModes.DBG_DrawConstraints |
		PhysDebugDrawModes.DBG_DrawNormals;

	const debugDrawer = new Ammo.DebugDrawer();

	function vecFromHeap(addr: number): Vector {
		const heap = Ammo.HEAPF32;

		const X = heap[(addr + 0) / 4];
		const Y = heap[(addr + 4) / 4];
		const Z = heap[(addr + 8) / 4];

		return new Vector(X, Y, Z);
	}

	debugDrawer.drawLine = function (from: any, to: any, color: any): void {
		ShapeRenderer.get().queueLine(vecFromHeap(from), vecFromHeap(to), vecFromHeap(color));
	};

	debugDrawer.drawContactPoint = function (
		pointOnB: any,
		normalOnB: any,
		distance: number,
		lifeTime: number,
		color: any,
	): void {
		// TODO: use lifetime for alpha?
		ShapeRenderer.get().queueLine(
			vecFromHeap(pointOnB),
			vecFromHeap(pointOnB).add(vecFromHeap(normalOnB).scale(distance)),
			vecFromHeap(color),
		);
	};

	debugDrawer.reportErrorWarning = function (warningString: string): void {
		console.log("AMMO WARNING: ", warningString);
	};

	debugDrawer.draw3dText = function (location: Ammo.btVector3, textString: string): void {
		// TODO
	};

	debugDrawer.setDebugMode = function (debugMode: number): void {
		debugMode = debugMode;
	};

	debugDrawer.getDebugMode = function (): number {
		return debugMode;
	};

	return debugDrawer;
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
