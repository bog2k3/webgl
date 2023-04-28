import { Entity } from "./entity";
import { RenderContext } from "../render/render-context";
import { IRenderable, isRenderable } from "../render/renderable";
import { isUpdatable, IUpdatable } from "./updateable";
import { checkGLError } from "../glcontext";
import { Event } from "../utils/event";
import { assert } from "../utils/assert";
import { physWorld } from "../../physics/physics";
import { Vector } from "../math/vector";
import { ShapeRenderer } from "../render/shape-renderer";
import { isDestructable } from "../../entities/destructable";
import { AABB } from "../math/aabb";

export class WorldConfig {
	/** set to true to disable propagation of user events */
	disableUserEvents = false;
	/** draw world boundaries */
	drawBoundaries = true;
	extent_Xn = -10;
	extent_Xp = 10;
	extent_Yn = -10;
	extent_Yp = 10;
	extent_Zn = -10;
	extent_Zp = 10;
}

export type EntityFilterOptions = {
	types?: string[];
	renderable?: boolean;
	updatable?: boolean;
	destructable?: boolean;
};

export class World implements IRenderable, IUpdatable {
	onEntityAdded = new Event<(ent: Entity) => void>();
	onEntityRemoved = new Event<(ent: Entity) => void>();

	constructor(config: WorldConfig) {
		assert(!World.instance_, "World is alread initialized");
		this.config_ = config;
		World.instance_ = this;
	}

	static getInstance(): World {
		assert(World.instance_ != null, "World is not initialized");
		return World.instance_;
	}

	static setGlobal<T>(class_: new (...args) => T, instance: T): void {
		World.globals[class_.name] = instance;
	}

	static getGlobal<T>(class_: new (...args) => T): T | null {
		return World.globals[class_.name] as T;
	}

	reset(): void {
		this.resetting_ = true;
		for (let e of this.entities_) {
			e.destroy();
		}
		this.entities_.splice(0);
		this.entsToRender_.splice(0);
		this.entsToUpdate_.splice(0);
		this.resetting_ = false;
	}

	update(dt: number): void {
		++this.frameNumber_;
		const fixedTimeStep = 1 / 60; // 60Hz update rate for physics
		const maxSubsteps = 10;
		physWorld.stepSimulation(dt, maxSubsteps, fixedTimeStep);
		for (const e of this.entsToUpdate_) {
			e.update(dt);
		}
	}

	render(context: RenderContext): void {
		checkGLError("before World::render");
		// draw extent lines:
		if (this.config_.drawBoundaries) {
			// draw the world origin:
			ShapeRenderer.get().queueLine(new Vector(), Vector.axisX(), Vector.axisX());
			ShapeRenderer.get().queueLine(new Vector(), Vector.axisY(), Vector.axisY());
			ShapeRenderer.get().queueLine(new Vector(), Vector.axisZ(), Vector.axisZ());
			// draw the world boundaries:
			const lineColor = new Vector(1, 0, 1);
			const overflow = 1.1;
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xn, this.config_.extent_Yp * overflow, this.config_.extent_Zn),
				new Vector(this.config_.extent_Xn, this.config_.extent_Yn * overflow, this.config_.extent_Zn),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xp, this.config_.extent_Yp * overflow, this.config_.extent_Zn),
				new Vector(this.config_.extent_Xp, this.config_.extent_Yn * overflow, this.config_.extent_Zn),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xn * overflow, this.config_.extent_Yp, this.config_.extent_Zn),
				new Vector(this.config_.extent_Xp * overflow, this.config_.extent_Yp, this.config_.extent_Zn),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xn * overflow, this.config_.extent_Yn, this.config_.extent_Zn),
				new Vector(this.config_.extent_Xp * overflow, this.config_.extent_Yn, this.config_.extent_Zn),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xn, this.config_.extent_Yp * overflow, this.config_.extent_Zp),
				new Vector(this.config_.extent_Xn, this.config_.extent_Yn * overflow, this.config_.extent_Zp),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xp, this.config_.extent_Yp * overflow, this.config_.extent_Zp),
				new Vector(this.config_.extent_Xp, this.config_.extent_Yn * overflow, this.config_.extent_Zp),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xn * overflow, this.config_.extent_Yp, this.config_.extent_Zp),
				new Vector(this.config_.extent_Xp * overflow, this.config_.extent_Yp, this.config_.extent_Zp),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xn * overflow, this.config_.extent_Yn, this.config_.extent_Zp),
				new Vector(this.config_.extent_Xp * overflow, this.config_.extent_Yn, this.config_.extent_Zp),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xn, this.config_.extent_Yn, this.config_.extent_Zn * overflow),
				new Vector(this.config_.extent_Xn, this.config_.extent_Yn, this.config_.extent_Zp * overflow),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xn, this.config_.extent_Yp, this.config_.extent_Zn * overflow),
				new Vector(this.config_.extent_Xn, this.config_.extent_Yp, this.config_.extent_Zp * overflow),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xp, this.config_.extent_Yn, this.config_.extent_Zn * overflow),
				new Vector(this.config_.extent_Xp, this.config_.extent_Yn, this.config_.extent_Zp * overflow),
				lineColor,
			);
			ShapeRenderer.get().queueLine(
				new Vector(this.config_.extent_Xp, this.config_.extent_Yp, this.config_.extent_Zn * overflow),
				new Vector(this.config_.extent_Xp, this.config_.extent_Yp, this.config_.extent_Zp * overflow),
				lineColor,
			);
		}
		// draw entities
		checkGLError("World.render() draw boundaries");
		for (const e of this.entsToRender_) {
			e.render(context);
			checkGLError(`Entity render (${e["constructor"].name})`);
		}
		checkGLError("World.render() end");
	}

	addEntity(e: Entity): void {
		this.entities_.push(e);
		if (isRenderable(e)) {
			this.entsToRender_.push(e);
		}
		if (isUpdatable(e)) {
			this.entsToUpdate_.push(e);
		}
		e["handleAddedToWorld"]();
		this.onEntityAdded.trigger(e);
	}

	removeEntity(e: Entity): void {
		if (!this.resetting_) {
			this.entities_.splice(this.entities_.indexOf(e), 1);
			if (isRenderable(e)) {
				this.entsToRender_.splice(this.entsToRender_.indexOf(e), 1);
			}
			if (isUpdatable(e)) {
				this.entsToUpdate_.splice(this.entsToUpdate_.indexOf(e), 1);
			}
		}
		e["handleRemovedFromWorld"]();
		this.onEntityRemoved.trigger(e);
	}

	getAllEntities(options?: EntityFilterOptions): Entity[] {
		return this.filterEntities(this.entities_, options);
	}

	getEntitiesInBox(aabb: AABB, filters?: EntityFilterOptions): Entity[] {
		throw new Error("Not implemented");
	}

	getEntitiesInArea(center: Vector, radius: number, filters?: EntityFilterOptions): Entity[] {
		throw new Error("Not implemented");
	}

	/** registers an event handler and returns the subscription id */
	registerEventHandler(eventName: string, handler: (param: number) => void): number {
		return this.mapUserEvents_[eventName].add(handler);
	}

	removeEventHandler(eventName: string, handlerId: number): void {
		this.mapUserEvents_[eventName].remove(handlerId);
	}

	triggerEvent(eventName: string, param: number): void {
		if (!this.config_.disableUserEvents) this.mapUserEvents_[eventName].trigger(param);
	}

	// --------------------- PRIVATE AREA --------------------- //

	private static instance_: World = null;
	private config_: WorldConfig;
	private entities_: Entity[] = [];
	private entsToUpdate_: IUpdatable[] = [];
	private entsToRender_: IRenderable[] = [];
	private frameNumber_ = 0;
	private resetting_ = false;
	private static globals: { [className: string]: unknown } = {};

	private mapUserEvents_: Record<string, Event<(param: number) => void>> = {};
	// std::unordered_map<std::type_index, void*> userGlobals_;

	private filterEntities(ents: Entity[], filters?: EntityFilterOptions): Entity[] {
		return ents.filter((e) => {
			if (filters?.types?.length && !filters.types.includes(e.getType())) {
				return false;
			}
			if (filters?.renderable && !isRenderable(e)) {
				return false;
			}
			if (filters?.updatable && !isUpdatable(e)) {
				return false;
			}
			if (filters?.destructable && !isDestructable(e)) {
				return false;
			}
			return true;
		});
	}
}
