import { ShaderProgram } from './../joglr/shader-program';

export class ShaderProgramManager {

	static async loadProgram(shaderClass: new () => ShaderProgram): Promise<void> {
		const className = shaderClass.name;
		if (!ShaderProgramManager.shaderPrograms_[className]) {
			ShaderProgramManager.shaderPrograms_[className] = new shaderClass();
			await (ShaderProgramManager.shaderPrograms_[className] as any).load();
		}
	}

	static requestProgram<T extends ShaderProgram>(shaderClass: new () => T): T {
		const className = shaderClass.name;
		if (!ShaderProgramManager.shaderPrograms_[className]) {
			throw new Error("Requested program is not loaded!");
		}
		return ShaderProgramManager.shaderPrograms_[className] as any;
	}

	static unloadAll(): void {
		for (let key in ShaderProgramManager.shaderPrograms_) {
			ShaderProgramManager.shaderPrograms_[key].release();
		}
		ShaderProgramManager.shaderPrograms_ = {};
	}

	private static shaderPrograms_: Record<string, ShaderProgram> = {};
};
