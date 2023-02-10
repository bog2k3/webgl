export abstract class AbstractVertex {

	/** Returns the size of the vertex, in bytes */
	abstract getStride(): number;

	abstract serialize(target: Float32Array, offset: number);

	static arrayToBuffer(array: AbstractVertex[]): ArrayBuffer {
		if (!array.length) {
			return null;
		}
		const elementSize = array[0].getStride();
		const ab = new Float32Array(array.length * elementSize);
		let offs = 0;
		for (let v of array) {
			v.serialize(ab, offs);
			offs += elementSize;
		}
		return ab;
	}
}