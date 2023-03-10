import { Quat } from "../joglfw/math/quat";
import { Transform } from "../joglfw/math/transform";
import { Vector } from "../joglfw/math/vector";
import { PhysBodyProxy } from "../physics/phys-body-proxy";

/**
 * Represents a frame of reference attached to some physical body using a relative transformation.
 * It's "virtual" because it doesn't contain any physical body
 */
export class VirtualFrame {
	localTransform = new Transform(new Vector(0), Quat.identity());

	constructor(public readonly parent: PhysBodyProxy | VirtualFrame) {}

	/** Returns the world transformation of the frame */
	getTransform(out_tr: Transform): void {
		const parentTr = new Transform();
		this.parent.getTransform(parentTr);
		out_tr.copyFrom(this.localTransform);
		out_tr.combineInPlace(parentTr);
	}
}
