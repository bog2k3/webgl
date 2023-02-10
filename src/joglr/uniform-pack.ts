enum UniformType {
	INT = "INT",
	FLOAT = "FLOAT",
	VEC2 = "VEC2",
	iVEC2 = "iVEC2",
	VEC3 = "VEC3",
	iVEC3 = "iVEC3",
	VEC4 = "VEC4",
	iVEC4 = "iVEC4",
	MAT3 = "MAT3",
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
		// TODO: implement
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
		// TODO: implement
	}

	// pushes a uniform value from this pack into OpenGL's pipeline at the specified location.
	// for array uniforms, all array elements are pushed at locations starting from [glLocation] incrementally.
	pushValue(indexInPack: number, glLocation: number): void {
		// TODO: implement
	}

	// ------------ PRIVATE AREA ---------------- //
	
	private elements_: Element[] = [];
};

class UniformElement {
	values: any[];

	constructor(public descriptor: UniformDescriptor) {
		values = new UniformValue[desc.arrayLength];
	}

	Element(Element && el)
		: descriptor(el.descriptor), transposed(el.transposed)
		, values(el.values) {
		el.values = nullptr;
		el.descriptor.arrayLength = 0;
	}

	~Element() {
		if (values)
			delete [] values;
	}
};