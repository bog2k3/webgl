import { Matrix } from "./../../joglfw/math/matrix";
import { Vector } from "./../../joglfw/math/vector";
import { UniformPack, UniformType } from "../../joglfw/render/uniform-pack";

export class UPackCommon extends UniformPack {
	constructor() {
		super();
		this.iEyePos = this.addUniform({ name: "eyePos", type: UniformType.VEC3, arrayLength: 1 });
		this.ibEnableClipping = this.addUniform({ name: "bEnableClipping", type: UniformType.INT, arrayLength: 1 });
		this.iSubspace = this.addUniform({ name: "subspace", type: UniformType.FLOAT, arrayLength: 1 });
		this.ibRefraction = this.addUniform({ name: "bRefraction", type: UniformType.INT, arrayLength: 1 });
		this.ibReflection = this.addUniform({ name: "bReflection", type: UniformType.INT, arrayLength: 1 });
		this.iTime = this.addUniform({ name: "time", type: UniformType.FLOAT, arrayLength: 1 });
		this.iFov = this.addUniform({ name: "fov", type: UniformType.VEC2, arrayLength: 1 });
		this.iMatVP = this.addUniform({ name: "matVP", type: UniformType.MAT4, arrayLength: 1 });
		this.iMatView = this.addUniform({ name: "matView", type: UniformType.MAT4, arrayLength: 1 });
	}

	setEyePos(val: Vector): void {
		this.setUniform(this.iEyePos, val.copy());
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
	setFOV(fov: number, aspectRatio: number): void {
		this.setUniform(this.iFov, new Vector(fov, aspectRatio));
	}
	setMatViewProj(val: Matrix): void {
		this.setUniform(this.iMatVP, val.copy());
	}
	setMatView(val: Matrix): void {
		this.setUniform(this.iMatView, val.copy());
	}

	// ---------------- PRIVATE AREA ----------------//

	private iEyePos: number;
	private ibEnableClipping: number;
	private iSubspace: number;
	private ibRefraction: number;
	private ibReflection: number;
	private iTime: number;
	private iFov: number;
	private iMatVP: number;
	private iMatView: number;
}
