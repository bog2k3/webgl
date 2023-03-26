export class TerrainConfig {
	/** random seed */
	seed = 0;

	/** length on X axis */
	width = 500.0;
	/** length on Z axis */
	length = 500.0;
	/** minimum Y axis value */
	minElevation = -10.0;
	/** maximum Y axis value */
	maxElevation = 25.0;
	seaFloorElevation = -20.0;

	/** vertices per meter (actual density may be slightly higher due to rounding,
	 * but is guaranteed to always be at least the specified value)
	 */
	vertexDensity = 1;

	/** random jitter applied to the vertex mesh in the XoZ plane;
	 * a value of 1.0 means the amplitude of the jitter is equal
	 * to the initial distance between vertices;
	 * this has the effect of producing an irregular (less matrix-like) mesh
	 */
	relativeRandomJitter = 0.4;

	/** between [0.0 and 1.0] controls the large-scale height variation of the terrain*/
	variation = 0.8;

	/** between [0.0 and 1.0] controls the small-scale roughness*/
	roughness = 0.5;
}
