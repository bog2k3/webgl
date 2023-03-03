import { Quat } from "../src/joglfw/math/quat";
import { Vector } from "../src/joglfw/math/vector";

const ang = Math.PI / 8;
console.log(`angle: ${ang}`);
const qYaw = Quat.axisAngle(Vector.axisY(), ang);
console.log(`yaw: `, qYaw.toEulerAngles(), qYaw);
const qPitch = Quat.axisAngle(Vector.axisX(), ang);
console.log(`pitch: `, qPitch.toEulerAngles(), qPitch);
const qRoll = Quat.axisAngle(Vector.axisZ(), ang);
console.log(`roll: `, qRoll.toEulerAngles(), qRoll);

console.log(`qFromYaw: `, Quat.fromEulerAngles(ang, 0, 0));
console.log(`qFromPitch: `, Quat.fromEulerAngles(0, ang, 0));
console.log(`qFromRoll: `, Quat.fromEulerAngles(0, 0, ang));
