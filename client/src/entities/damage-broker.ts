import { Entity } from "../joglfw/world/entity";
import { World } from "../joglfw/world/world";
import { IDestructable, SplashDamage } from "./destructable";

export class DamageBroker {
	dealSplashDamage(damage: SplashDamage): void {
		const damageThreshold = 1.0; // at the distance where the damage would drop below this threshold, we stop searching for targets
		const maxRadius = Math.pow(damage.maxDamage / damageThreshold - 1, 0.25);
		const affectedEntities: (Entity & IDestructable)[] = World.getInstance().getEntitiesInArea(
			damage.wEpicenter,
			maxRadius,
			{ destructable: true },
		) as (Entity & IDestructable)[];
		affectedEntities.forEach((e) => e.takeDamage({ splashDamage: damage }));
	}
}
