import { Matrix } from "./../../joglr/math/matrix";
import { Vector } from "./../../joglr/math/vector";
import { UniformPack, UniformType } from "../../joglr/render/uniform-pack";

export class UPackCommon extends UniformPack {
	constructor() {
		super();
		this.iEyePos = this.addUniform({ name: "eyePos", type: UniformType.VEC3, arrayLength: 1 });
		this.ibEnableClipping = this.addUniform({ name: "bEnableClipping", type: UniformType.INT, arrayLength: 1 });
		this.iSubspace = this.addUniform({ name: "subspace", type: UniformType.FLOAT, arrayLength: 1 });
		this.ibRefraction = this.addUniform({ name: "bRefraction", type: UniformType.INT, arrayLength: 1 });
		this.ibReflection = this.addUniform({ name: "bReflection", type: UniformType.INT, arrayLength: 1 });
		this.iTime = this.addUniform({ name: "time", type: UniformType.FLOAT, arrayLength: 1 });
		this.iMatPV = this.addUniform({ name: "matPV", type: UniformType.MAT4, arrayLength: 1 });
	}

	setEyePos(val: Vector): void {
		this.setUniform(this.iEyePos, val);
	}
	setEnableClipping(val: boolean): void {
		this.setUniform(this.ibEnableClipping, val ? 1 : 0);
	}
	setSubspace(val: number): void {
		this.setUniform(this.iSubspace, val);
	}
	setbRefraction(val: boolean): void {
		this.setUniform(this.ibRefraction, val ? 1 : 0);
	}
	setbReflection(val: boolean): void {
		this.setUniform(this.ibReflection, val ? 1 : 0);
	}
	setTime(val: number): void {
		this.setUniform(this.iTime, val);
	}
	setMatProjView(val: Matrix): void {
		this.setUniform(this.iMatPV, val);
	}

	// ---------------- PRIVATE AREA ----------------//

	private iEyePos: number;
	private ibEnableClipping: number;
	private iSubspace: number;
	private ibRefraction: number;
	private ibReflection: number;
	private iTime: number;
	private iMatPV: number;
}
