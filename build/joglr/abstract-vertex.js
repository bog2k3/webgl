export class AbstractVertex {
    static arrayToBuffer(array) {
        if (!array.length) {
            return null;
        }
        const elementSize = array[0].getSize();
        const ab = new Float32Array(array.length * elementSize);
        let offs = 0;
        for (let v of array) {
            v.serialize(ab, offs);
            offs += elementSize;
        }
        return ab;
    }
}
//# sourceMappingURL=abstract-vertex.js.map