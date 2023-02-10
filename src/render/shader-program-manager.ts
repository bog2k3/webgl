import { ShaderProgram } from './../joglr/shader-program';

export class ShaderProgramManager {

	static async loadProgram(shaderClass: new () => ShaderProgram): Promise<void> {
		if (!ShaderProgramManager.shaderPrograms_[shaderClass.toString()]) {
			ShaderProgramManager.shaderPrograms_[shaderClass.toString()] = new shaderClass();
			await (ShaderProgramManager.shaderPrograms_[shaderClass.toString()] as any).load();
		}
	}

	static requestProgram<T extends ShaderProgram>(shaderClass: new () => T): T {
		if (!ShaderProgramManager.shaderPrograms_[shaderClass.toString()]) {
			throw new Error("Requested program is not loaded!");
		}
		return ShaderProgramManager.shaderPrograms_[shaderClass.toString()] as any;
	}

	static unloadAll(): void {
		for (let key in ShaderProgramManager.shaderPrograms_) {
			ShaderProgramManager.shaderPrograms_[key].release();
		}
		ShaderProgramManager.shaderPrograms_ = {};
	}

	private static shaderPrograms_: Record<string, ShaderProgram>;
};
