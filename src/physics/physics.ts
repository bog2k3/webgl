import Ammo from "ammojs-typed";

export let physics: typeof Ammo;

export function initializePhysics(): Promise<void> {
	return Ammo().then((p) => {
		physics = p;
	});
}
