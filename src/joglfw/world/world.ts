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

export class World implements IRenderable, IUpdatable {
	constructor(config: WorldConfig) {
		assert(!World.instance_, "World is alread initialized");
		this.config_ = config;
		World.instance_ = this;
	}

	static getInstance(): World {
		assert(World.instance_ != null, "World is not initialized");
		return World.instance_;
	}

	reset(): void {
		this.resetting_ = true;
		for (let e of this.entities_) {
			e.destroy();
		}
		this.entities_.splice(0);
		this.entsToRender_.splice(0);
		this.entsToUpdate_.splice(0);
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
			ShapeRenderer.get().queueLine(new Vector(), new Vector(1, 0, 0), new Vector(1, 0, 0));
			ShapeRenderer.get().queueLine(new Vector(), new Vector(0, 1, 0), new Vector(0, 1, 0));
			ShapeRenderer.get().queueLine(new Vector(), new Vector(0, 0, 1), new Vector(0, 0, 1));
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
	}

	removeEntity(e: Entity): void {
		assert(e.isDestroyed(), "Cannot remove undestroyed entity from world. Call Entity.destroy() instead");
		if (!this.resetting_) {
			this.entities_.splice(this.entities_.indexOf(e), 1);
			this.entsToRender_.splice(this.entities_.indexOf(e), 1);
			this.entsToUpdate_.splice(this.entities_.indexOf(e), 1);
		}
	}

	getEntities(filterTypes: string[], options?: { renderable?: boolean; updatable?: boolean }): Entity[] {
		return this.entities_.filter((e) => {
			if (filterTypes.length && !filterTypes.includes(e.getType())) {
				return false;
			}
			if (options?.renderable && !isRenderable(e)) {
				return false;
			}
			if (options?.updatable && !isUpdatable(e)) {
				return false;
			}
			return true;
		});
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

	setGlobal<T>(className: new (...args) => T, instance: T): void {
		this.globals[className.constructor.name] = instance;
	}

	getGlobal<T>(className: new (...args) => T): T | null {
		return this.globals[className.constructor.name] as T;
	}

	// --------------------- PRIVATE AREA --------------------- //

	static instance_: World = null;
	config_: WorldConfig;
	entities_: Entity[] = [];
	entsToUpdate_: IUpdatable[] = [];
	entsToRender_: IRenderable[] = [];
	frameNumber_ = 0;
	resetting_ = false;
	globals: { [className: string]: unknown } = {};

	mapUserEvents_: Record<string, Event<(param: number) => void>> = {};
	// std::unordered_map<std::type_index, void*> userGlobals_;
}
