import { checkGLError, gl } from "./glcontext";
import { Matrix } from "./math/matrix";
import { Vector } from "./math/vector";

enum UniformType {
	INT = "INT",
	FLOAT = "FLOAT",
	VEC2 = "VEC2",
	iVEC2 = "iVEC2",
	VEC3 = "VEC3",
	iVEC3 = "iVEC3",
	VEC4 = "VEC4",
	iVEC4 = "iVEC4",
	// MAT3 = "MAT3",
	MAT4 = "MAT4"
};

export class UniformDescriptor {
	// name of the uniform as it appears in the shader
	name: string;
	// type of the uniform as it is declared in the shader
	type: UniformType;
	// number of array elements if the uniform is an array, or zero otherwise.
	arrayLength = 0;
};

// provides a collection of uniforms that can be shared accross multiple programs
export class UniformPack {
	// adds a uniform description to the pack;
	// returns the index of the new uniform within this pack.
	addUniform(desc: UniformDescriptor): number {
		if (desc.arrayLength == 0)
			desc.arrayLength = 1;
		this.elements_.push(new UniformElement(desc));
		return this.elements_.length - 1;
	}

	// returns the number of uniforms held by this pack
	count(): number { return this.elements_.length; }

	// returns the ith uniform descriptor within this pack.
	element(i: number): UniformDescriptor { return this.elements_[i].descriptor; }

	// the following methods set values for the uniforms within this pack.
	// Note that these values are not sent to OpenGL yet, that only happens
	// when a ShaderProgram that uses this pack is being set up for rendering.

	// set a simple uniform value;
	// [indexInPack] represents the uniform index within the current UniformPack, as the value
	// returned by addUniform()
	setUniform<T>(indexInPack: number, value: T): void {
		this.setUniformIndexed<T>(indexInPack, 0, value);
	}

	// set an indexed uniform value (for array uniforms);
	// [indexInPack] represents the uniform index within the current UniformPack, as the value
	// returned by addUniform()
	// [locationIndex] represents the array index to set the value for
	setUniformIndexed<T>(indexInPack: number, locationIndex: number, value: T): void {
		if (indexInPack >= this.elements_.length) {
			throw new Error("Requested index is not present in uniform pack");
		}
		const el: UniformElement = this.elements_[indexInPack];
		if (locationIndex >= el.descriptor.arrayLength) {
			throw new Error("Requested array index not present in selected uniform");
		}
		el.values[locationIndex] = value;
	}

	// pushes a uniform value from this pack into OpenGL's pipeline at the specified location.
	// for array uniforms, all array elements are pushed at locations starting from [glLocation] incrementally.
	pushValue(indexInPack: number, glLocation: WebGLUniformLocation): void {
		if (indexInPack >= this.elements_.length) {
			throw new Error("Requested index is not present in uniform pack");
		}
		const el: UniformElement = this.elements_[indexInPack];

		for (let i=0; i < el.descriptor.arrayLength; i++) {
			if (i > 0) {
				throw new Error("setting array locations after #0 not implemented");
			}
			switch (el.descriptor.type) {
				case UniformType.INT:
					gl.uniform1i(glLocation /*+ i*/, el.values[i]);
				break;
				case UniformType.FLOAT:
					gl.uniform1f(glLocation /*+ i*/, el.values[i]);
				break;
				case UniformType.VEC2:
				case UniformType.iVEC2:
					gl.uniform2fv(glLocation /*+ i*/, (el.values[i] as Vector).values(2));
				break;
				case UniformType.VEC3:
				case UniformType.iVEC3:
					gl.uniform3fv(glLocation /*+ i*/, (el.values[i] as Vector).values(3));
				break;
				case UniformType.VEC4:
				case UniformType.iVEC4:
					gl.uniform4fv(glLocation /*+ i*/, (el.values[i] as Vector).values(4));
				break;
				case UniformType.MAT4:
					gl.uniformMatrix4fv(glLocation /*+ 4*i*/, false, (el.values[i] as Matrix).m); // TODO https://www.gamedev.net/forums/topic/658191-webgl-how-to-send-an-array-of-matrices-to-the-vertex-shader/
				break;
			}
		}
		checkGLError("UniformPack::pushValue");
	}

	// ------------ PRIVATE AREA ---------------- //

	private elements_: UniformElement[] = [];
};

class UniformElement {
	values: any[];

	constructor(public descriptor: UniformDescriptor) {
		this.values = new Array(descriptor.arrayLength);
	}
};
