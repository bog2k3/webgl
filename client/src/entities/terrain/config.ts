export class TerrainConfig {
	/** random seed */
	seed = 0;

	/** length on X axis */
	width = 200.0;
	/** length on Z axis */
	length = 200.0;
	/** minimum Y axis value */
	minElevation = -10.0;
	/** maximum Y axis value */
	maxElevation = 25.0;
	seaFloorElevation = -20.0;

	/** vertices per meter (actual density may be slightly higher due to rounding,
	 * but is guaranteed to always be at least the specified value)
	 */
	vertexDensity = 1.0;

	/** random jitter applied to the vertex mesh in the XoZ plane;
	 * a value of 1.0 means the amplitude of the jitter is equal
	 * to the initial distance between vertices;
	 * this has the effect of producing an irregular (less matrix-like) mesh
	 */
	relativeRandomJitter = 0.8;

	/** between [0.0 and 1.0] */
	roughness = 0.5;
}
