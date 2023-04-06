import { Entity } from "../joglfw/world/entity";

export type CustomEntityOptions = {
	isRemote?: boolean;
};

export abstract class CustomEntity extends Entity {
	constructor(options?: CustomEntityOptions) {
		super();
		this.setAttribute("is_remote", options?.isRemote ?? false);
	}
	isRemote(): boolean {
		return this.getAttribute("is_remote") === true;
	}
}
