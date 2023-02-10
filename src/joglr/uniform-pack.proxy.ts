import { gl } from "./glcontext";
import { UniformDescriptor, UniformPack } from "./uniform-pack";

export class UniformPackProxy {
	constructor (private pack_: UniformPack) {
		if (!pack_) {
			throw new Error("Invalid uniformPack provided to UniformPackProxy.ctor()");
		}
	}

	// updates the internal mappings between the uniform pack and the opengl program.
	updateMappings(programId: WebGLProgram): void {
		if (!programId) {
			throw new Error("Invalid programId provided to UniformPackProxy.updateMappings()");
		}
		this.uniformIndexes_ = [];
		for (let i=0, n=this.pack_.count(); i<n; i++) {
			let desc: UniformDescriptor = this.pack_.element(i);
			let location: WebGLUniformLocation = gl.getUniformLocation(programId, desc.name);
			this.uniformIndexes_.push(location);
		}
	}

	// pushes all uniform values from the uniform pack into corresponding openGL's uniform locations
	pushValues(): void {
		for (let i=0; i<this.uniformIndexes_.length; i++) {
			if (this.uniformIndexes_[i]) {
				this.pack_.pushValue(i, this.uniformIndexes_[i]);
			}
		}
	}

	getPack(): UniformPack {
		return this.pack_;
	}

	uniformIndexes_: WebGLUniformLocation[] = []; // maps each uniform from the pack to the actual uniform location in the program
};