import { AABB } from "../joglfw/math/aabb";
import { Plane } from "../joglfw/math/plane";
import { Vector } from "../joglfw/math/vector";

export interface AABBGeneratorInterface<ObjectType> {
	/** returns the axis-aligned bounding box for a given object */
	getAABB(obj: ObjectType): AABB;
}

export class BSPConfig {
	/**
	 * [targetVolume] is an AABB that encompasses all of the objects (the entire space that will be partitioned).
	 * if [targetVolume] is empty, then BSPTree will compute it automatically as the reunion of the AABBs of all objects.
	 */
	targetVolume: AABB;
	/**
	 * [maxDepth] specifies the maximum number of divisions in each spatial direction
	 * a value of 0 for an axis means unlimitted depth in that direction.
	 * If a split would result in depth increasing beyond maxDepth, the split is not performed.
	 */
	maxDepth: Vector;
	/**
	 * [minCellSize] specifies the minimum cell size for each spatial direction
	 * a value of 0.f for an axis means no limit on the cell size on that axis. If a split would result in cells
	 * less than the minCellSize, then the split is not performed.
	 */
	minCellSize: Vector;
	/**
	 * This parameter enables the ability to dynamically add to and remove objects from the BSPTree after it has been created.
	 * Only use it when you really need it, because it implies a performance cost.
	 */
	dynamic = false;
	/**
	 * number of objects in a cell above which splits are enabled. A split will only be performed on the cell
	 * if the number of objects within is strictly greater than [minObjects].
	 * There can exist cells with less than the minObjects number of objects.
	 */
	minObjects: number;

	constructor(data: BSPConfig) {
		Object.assign(this, data);
	}
}

export class BSPNode<ObjectType> {
	constructor(
		private readonly aabbGenerator: AABBGeneratorInterface<ObjectType>,
		private readonly parent: BSPNode<ObjectType>,
		private readonly aabb: AABB,
		public readonly objects: ObjectType[],
	) {}

	split(config: BSPConfig): void {
		if (this.objects.length <= config.minObjects) {
			return; // too few objects to split
		}
		// determine the potential split axes:
		let crtCellSize = this.aabb.size();
		const splitAxes: number[] = [0, 1, 2];
		// sort the axes in the order of preference -> a larger box size in one direction is preferred.
		for (let i = 0; i < 2; i++)
			for (let j = i + 1; j < 3; j++)
				if (crtCellSize[splitAxes[i]] < crtCellSize[splitAxes[j]]) {
					[splitAxes[i], splitAxes[j]] = [splitAxes[j], splitAxes[i]];
				}
		for (let i = 0; i < 3; i++) {
			const splitAxis = ["x", "y", "z"][splitAxes[i]];
			// we must decide if the split on the current axis is actually possible according to the rules
			if (config.maxDepth[splitAxis] != 0 && this.depth[splitAxis] + 1 > config.maxDepth[splitAxis]) {
				continue; // we would exceed maxDepth in the requested direction so we don't split on this axis
			}
			// compute the new AABBs of the would-be child nodes
			const splitCoord = (this.aabb.vMin[splitAxis] + this.aabb.vMax[splitAxis]) * 0.5; // TODO choose the coord of the median element instead for an enven split
			const aabbNegative = this.aabb.copy();
			aabbNegative.vMax[splitAxis] = splitCoord;
			const aabbPositive = this.aabb.copy();
			aabbPositive.vMin[splitAxis] = splitCoord;
			// check if the AABBs of the children are not smaller than the minCellSize
			if (
				aabbNegative.size()[splitAxis] < config.minCellSize[splitAxis] ||
				aabbPositive.size()[splitAxis] < config.minCellSize[splitAxis]
			)
				continue; // too small would-be cells, we don't split on this axis

			// all right, split is acceptable.
			// distribute objects between the two sides:
			this.splitPlane[["a", "b", "c"][splitAxes[i]]] = 1;
			this.splitPlane.d = -splitCoord;
			const objectsNeg: ObjectType[] = [];
			const objectsPos: ObjectType[] = [];
			for (let k = 0; k < this.objects.length; k++) {
				const q: number = this.aabbGenerator.getAABB(this.objects[k]).qualifyPlane(this.splitPlane);
				if (q >= 0) objectsPos.push(this.objects[k]);
				if (q <= 0) objectsNeg.push(this.objects[k]);
			}
			// we no longer need to keep the vector of objects:
			this.objects.splice(0);

			// and do the split now:
			this.negative = new BSPNode<ObjectType>(this.aabbGenerator, this, aabbNegative, objectsNeg);
			this.negative.depth = this.depth;
			this.negative.depth[splitAxis]++;
			this.negative.split(config);

			this.positive = new BSPNode<ObjectType>(this.aabbGenerator, this, aabbPositive, objectsPos);
			this.positive.depth = this.depth;
			this.positive.depth[splitAxis]++;
			this.positive.split(config);

			break; // we're done splitting, we don't care about the remaining potential axes
		}
	}

	negative: BSPNode<ObjectType> = null;
	positive: BSPNode<ObjectType> = null;
	depth = new Vector(1, 1, 1);
	splitPlane = new Plane(0, 0, 0, 0);
}

/**
 * BSPTree that contains objects of type ObjectType.
 * You must provide an implementation of AABBGeneratorInterface that returns axis-aligned bounding boxes for your objects.
 */
export class BSPTree<ObjectType> {
	/** The aabbGenerator object must exist throughout the lifetime of this BSPTree; the caller is responsible for this. */
	constructor(config: BSPConfig, aabbGenerator: AABBGeneratorInterface<ObjectType>, objects: ObjectType[]) {
		if (config.dynamic) {
			throw new Error("Dynamic BSP tree not yet implemented");
		}
		let rootAABB: AABB;
		if (config.targetVolume.isEmpty()) {
			rootAABB = new AABB();
			// compute from objects
			for (const obj of objects) {
				rootAABB.unionInPlace(aabbGenerator.getAABB(obj));
			}
		} else {
			rootAABB = config.targetVolume;
		}

		this.root = new BSPNode<ObjectType>(aabbGenerator, null, rootAABB, [...objects]);
		this.root.split(config);
	}

	/**
	 * Returns a list of leaf nodes that are intersected by or contained within a given AABB
	 * If one or more vertices of the AABB lie strictly on the boundary of some nodes, those nodes are not returned.
	 */
	getNodesAABB(aabb: AABB): BSPNode<ObjectType>[] {
		throw new Error("Not implemented");
	}

	// Returns the leaf node that contains the point p. If the point is on the boundary between two nodes,
	// the "positive" node (on the positive side of the separation plane) is chosen by convention.
	// Separation planes are always oriented with the positive side in the positive direction of the corresponding world axis.
	getNodeAtPoint(p: Vector): BSPNode<ObjectType> {
		let n: BSPNode<ObjectType> = this.root;
		while (n.positive) {
			const q = n.splitPlane.pointDistance(p);
			if (q >= 0) n = n.positive;
			else n = n.negative;
		}
		return n;
	}

	// ----------------------- PRIVATE AREA ----------------------------- //

	root: BSPNode<ObjectType> = null;
}
