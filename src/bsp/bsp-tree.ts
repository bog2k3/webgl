import { AABB } from "../joglfw/math/aabb";
import { Plane } from "../joglfw/math/plane";
import { Vector } from "../joglfw/math/vector";

interface AABBGeneratorInterface<ObjectType> {
	/** returns the axis-aligned bounding box for a given object */
	getAABB(obj: ObjectType): AABB;
};

class BSPConfig {
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
};

class BSPNode<ObjectType> {
	constructor(
		private readonly aabbGenerator: AABBGeneratorInterface<ObjectType>,
		private readonly parent: BSPNode<ObjectType>,
		private aabb: AABB,
		public readonly objects: ObjectType[]
	) {
	}

	split(config: BSPConfig): void {
		if (objects_.size() <= config.minObjects)
			return; // too few objects to split
		// determine the potential split axes:
		glm::vec3 crtCellSize = aabb_.size();
		int splitAxes[3] {0, 1, 2};
		// sort the axes in the order of preference -> a larger box size in one direction is preferred.
		for (int i=0; i<2; i++)
			for(int j=i+1; j<3; j++)
				if (crtCellSize[splitAxes[i]] < crtCellSize[splitAxes[j]]) {
					xchg(splitAxes[i], splitAxes[j]);
				}
		for (int i=0; i<3; i++) {
			int splitAxis = splitAxes[i];
			// we must decide if the split on the current axis is actually possible according to the rules
			if (config.maxDepth[splitAxis] != 0 && (depth_[splitAxis] + 1) > config.maxDepth[splitAxis])
				continue; // we would exceed maxDepth in the requested direction so we don't split on this axis
			// compute the new AABBs of the would-be child nodes
			float splitCoord = (aabb_.vMin[splitAxis] + aabb_.vMax[splitAxis]) * 0.5f;
			AABB aabbNegative(aabb_);
			aabbNegative.vMax[splitAxis] = splitCoord;
			AABB aabbPositive(aabb_);
			aabbPositive.vMin[splitAxis] = splitCoord;
			// check if the AABBs of the children are not smaller than the minCellSize
			if (aabbNegative.size()[splitAxis] < config.minCellSize[splitAxis]
				|| aabbPositive.size()[splitAxis] < config.minCellSize[splitAxis])
				continue; // too small would-be cells, we don't split on this axis

			// all right, split is acceptable.
			// distribute objects between the two sides:
			splitPlane_[splitAxis] = 1.f;
			splitPlane_.w = -splitCoord;
			std::vector<ObjectType> objectsNeg;
			std::vector<ObjectType> objectsPos;
			for (unsigned k=0; k<objects_.size(); k++) {
				int q = aabbGenerator_->getAABB(objects_[k]).qualifyPlane(splitPlane_);
				if (q >= 0)
					objectsPos.push_back(objects_[k]);
				if (q <= 0)
					objectsNeg.push_back(objects_[k]);
			}
			// we no longer need to keep the vector of objects:
			decltype(objects_){}.swap(objects_);

			// and do the split now:
			negative_ = new BSPNode<ObjectType>(aabbGenerator_, this, aabbNegative, std::move(objectsNeg));
			negative_->depth_ = depth_;
			negative_->depth_[splitAxis]++;
			negative_->split(config);

			positive_ = new BSPNode<ObjectType>(aabbGenerator_, this, aabbPositive, std::move(objectsPos));
			positive_->depth_ = depth_;
			positive_->depth_[splitAxis]++;
			positive_->split(config);

			break; // we're done splitting, we don't care about the remaining potential axes
		}
	}

	negative: BSPNode<ObjectType> = null;
	positive: BSPNode<ObjectType> = null;
	depth = new Vector(1, 1, 1);
	splitPlane_ = new Plane(0, 0, 0, 0);
};

// BSPTree that contains objects of type ObjectType.
// You must provide an implementation of AABBGeneratorInterface that returns axis-aligned bounding boxes for your objects.
template<class ObjectType>
class BSPTree {
public:
	using ObjectType = ObjectType;
	using BSPNode<ObjectType> = BSPNode<ObjectType>;

	// The aabbGenerator object must exist throughout the lifetime of this BSPTree; the caller is responsible for this.
	BSPTree(BSPConfig const& config, AABBGeneratorInterface<ObjectType>* aabbGenerator, std::vector<ObjectType> &&objects);

	// Returns a list of leaf nodes that are intersected by or contained within a given AABB
	// If one or more vertices of the AABB lie strictly on the boundary of some nodes, those nodes are not returned.
	std::vector<BSPNode<ObjectType>*> getNodesAABB(AABB const& aabb_) const;

	// Returns the leaf node that contains the point p. If the point is on the boundary between two nodes,
	// the "positive" node (on the positive side of the separation plane) is chosen by convention.
	// Separation planes are always oriented with the positive side in the positive direction of the corresponding world axis.
	BSPNode<ObjectType>* getNodeAtPoint(glm::vec3 const& p) const;

private:
	friend class BSPDebugDraw;

	BSPNode<ObjectType> *root_ = nullptr;
	std::map<ObjectType, BSPNode<ObjectType>*> valueNodes_; // maps objects back to the nodes they belong to (only for dynamic usage)
};