import { Matrix } from "./matrix";
import { Vector } from "./vector";
export function clamp(x, a, b) {
    if (x < a)
        return a;
    if (x > b)
        return b;
    return x;
}
export function lerp(a, b, f) {
    f = clamp(f, 0, 1);
    return a * (1 - f) + b * f;
}
export function sqr(x) {
    return x * x;
}
export function project(v, matWorldViewProj) {
    v.w = 1;
    return v.mul(matWorldViewProj);
}
export function buildViewportMatrix(viewportW, viewportH) {
    return Matrix.scale(viewportW / 2, -viewportH / 2, -0.5)
        .mul(Matrix.translate(new Vector(viewportW / 2, viewportH / 2, 0.5)));
}
export function buildProjectionMatrix(vFOV, aspectRatio, zNear, zFar) {
    const cotHalfFov = 1.0 / Math.tan(vFOV / 2);
    return new Matrix(cotHalfFov / aspectRatio, 0, 0, 0, 0, cotHalfFov, 0, 0, 0, 0, (zNear + zFar) / (zFar - zNear), 1, 0, 0, -2 * zNear * zFar / (zFar - zNear), 1);
}
export function buildViewMatrix(cameraPosition, cameraDirection, upVector) {
    const cZAxis = cameraDirection;
    const cXAxis = cZAxis.cross(upVector).normalize();
    const cYAxis = cXAxis.cross(cZAxis).normalize();
    const cTransInv = new Vector(-cameraPosition.dot(cXAxis), -cameraPosition.dot(cYAxis), -cameraPosition.dot(cZAxis));
    return new Matrix(cXAxis.x, cYAxis.x, cZAxis.x, 0, cXAxis.y, cYAxis.y, cZAxis.y, 0, cXAxis.z, cYAxis.z, cZAxis.z, 0, cTransInv.x, cTransInv.y, cTransInv.z, 1);
}
//# sourceMappingURL=functions.js.map