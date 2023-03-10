#ifndef TERRAIN_TEXTURE_GLSL
#define TERRAIN_TEXTURE_GLSL

vec4 mixTerrainTextures(vec4 t0, vec4 t1, vec4 t2, vec4 t3, vec4 t4, vec4 texBlendFactor) {
	vec4 t01 = mix(t0, t1, clamp(texBlendFactor.x, 0.0, 1.0)); // dirt and grass
	vec4 t23 = mix(t2, t3, clamp(texBlendFactor.y, 0.0, 1.0)); // rock 1 and rock 2
	vec4 tGrassOrSand = vec4(mix(t01, t4, clamp(texBlendFactor.w, 0.0, 1.0)).xyz, 1.0); // grass/dirt and sand
	vec4 tFinal = vec4(mix(tGrassOrSand, t23, 1.0 - clamp(texBlendFactor.z, 0.0, 1.0)).xyz, 1.0);
	return tFinal;
}

#endif // TERRAIN_TEXTURE_GLSL
