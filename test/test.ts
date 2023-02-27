import { Quat } from "../src/joglfw/math/quat";
import { Vector } from "../src/joglfw/math/vector";

const ang = Math.PI / 8;
console.log(`angle: ${ang}`);
const qYaw = Quat.axisAngle(new Vector(0, 1, 0), ang);
console.log(`yaw: `, qYaw.toEulerAngles(), qYaw);
const qPitch = Quat.axisAngle(new Vector(1, 0, 0), ang);
console.log(`pitch: `, qPitch.toEulerAngles(), qPitch);
const qRoll = Quat.axisAngle(new Vector(0, 0, 1), ang);
console.log(`roll: `, qRoll.toEulerAngles(), qRoll);

console.log(`qFromYaw: `, Quat.fromEulerAngles(ang, 0, 0));
console.log(`qFromPitch: `, Quat.fromEulerAngles(0, ang, 0));
console.log(`qFromRoll: `, Quat.fromEulerAngles(0, 0, ang));
