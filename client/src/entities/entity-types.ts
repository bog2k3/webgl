import { StockEntityTypes } from "../joglfw/world/stock-entity-types";

export enum CustomEntityType {
	StaticMesh = "StaticMesh",
	Terrain = "Terrain",
	SkyBox = "SkyBox",
	FreeCamera = "FreeCamera",
	RigidObject = "RigidObject",
	Car = "Car",
	Projectile = "Projectile",
}

export const EntityTypes = {
	...StockEntityTypes,
	...CustomEntityType,
};
export type EntityTypes = typeof CustomEntityType & typeof StockEntityTypes;
