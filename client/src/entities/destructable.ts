import { Vector } from "../joglfw/math/vector";

export type SplashDamage = {
	/** Epicenter of explosion, in world space. Use this to compute distance and direction of hit */
	wEpicenter: Vector;
	/** The normal vector at the impact point */
	hitNormal: Vector;
	/**
	 * The amount of damage that would be received at the epicenter.
	 * This has a dropoff proportional to the 4th power of the distance from the epicenter plus 1
	 * The amount of received damage should be
	 * dh = maxDamage / (1 + distance_from_epicenter^4) / targetArmor
	 **/
	maxDamage: number;
	/**
	 * The maximum throw-force, at the epicenter.
	 * This force blows objects away, but does not damage them. It is not affected by target's armor.
	 * Same dropoff as for damage applies.
	 */
	maxForce: number;
};

export type DamageConfig = {
	/**
	 * This represents damage impacted by a direct hit. The amount of health to be subtracted
	 * is dh = directDamage / targetArmor
	 * where targetArmor is the "armor" stat of the target (1 by default, but can be larger)
	 **/
	directDamage?: number;

	/** Damage received from an indirect hit, such as a nearby explosion */
	splashDamage?: SplashDamage;
};

export interface IDestructable {
	takeDamage(damage: DamageConfig);
	getHealth(): number;
	getMaxHealth(): number;
}

export function isDestructable(x): x is IDestructable {
	return "takeDamage" in x && "getHealth" in x;
}
