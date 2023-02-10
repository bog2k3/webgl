import { StockEntityTypes } from "../joglfw/world/stock-entity-types";

export enum CustomEntityType {
	StaticMesh = "StaticMesh",
	Terrain = "Terrain",
	SkyBox = "SkyBox",
	FreeCamera = "FreeCamera",
}

export const EntityTypes = {
	...StockEntityTypes,
	...CustomEntityType,
};
export type EntityTypes = typeof CustomEntityType & typeof StockEntityTypes;
