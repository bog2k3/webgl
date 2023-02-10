export declare abstract class AbstractVertex {
    abstract getSize(): number;
    abstract serialize(target: Float32Array, offset: number): any;
    static arrayToBuffer(array: AbstractVertex[]): ArrayBuffer;
}
