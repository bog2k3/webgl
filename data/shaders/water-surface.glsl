#ifndef WATER_SURFACE_GLSL
#define WATER_SURFACE_GLSL

#include common.glsl

uniform sampler2D textureWaterNormal;

const vec3 waterSmoothNormal = vec3(0, 1, 0);
const vec2 waterTextureTile = vec2(0.01);

vec3 computeWaterNormal(vec2 wPosXZ, float time, float eyeDist, float perturbAmplitude, bool mixLowFreq) {
	//return waterSmoothNormal;

	vec2 uv = wPosXZ * waterTextureTile;

	const float amplitudeFactor = 2;

	const vec2 moveSpeed1 = vec2(0.02, 0.1) * 0.15;
	const float density1 = 1.0;
	const float amplitude1 = 0.2 * amplitudeFactor;
	float amplitudeDistanceFactor1 = pow(min(1.0, 30.0 / (eyeDist+1)), 1.0);
	vec2 uv1 = (uv + (time * moveSpeed1)) * density1;
	vec3 texNormal1 = (texture(textureWaterNormal, uv1 * 0.5).rbg * 2 - 1) * amplitude1 * amplitudeDistanceFactor1;

	const vec2 moveSpeed2 = -vec2(0.02, 0.1) * 0.12;
	const float density2 = 10.0;
	const float amplitude2 = 0.2 * amplitudeFactor;
	float amplitudeDistanceFactor2 = pow(min(1.0, 30.0 / (eyeDist+1)), 1.0);
	vec2 uv2 = (uv + (time * moveSpeed2)) * density2;
	vec3 texNormal2 = (texture(textureWaterNormal, uv2 * 0.5).rbg * 2 - 1) * amplitude2 * amplitudeDistanceFactor2;

	const vec2 moveSpeed3 = -vec2(0.02, 0.1) * 0.05;
	const float density3 = 25.0;
	const float amplitude3 = 0.2 * amplitudeFactor;
	float amplitudeDistanceFactor3 = pow(min(1.0, 30.0 / (eyeDist+1)), 1.0);
	vec2 uv3 = (uv + (time * moveSpeed3)) * density3;
	vec3 texNormal3 = (texture(textureWaterNormal, uv3 * 0.5).rbg * 2 - 1) * amplitude3 * amplitudeDistanceFactor3;

	const vec2 moveSpeed4 = -moveSpeed3;
	const float density4 = density3;
	const float amplitude4 = amplitude3;
	float amplitudeDistanceFactor4 = amplitudeDistanceFactor3;
	vec2 uv4 = (uv + (time * moveSpeed4)) * density4;
	vec3 texNormal4 = (texture(textureWaterNormal, uv4 * 0.5).rbg * 2 - 1) * amplitude4 * amplitudeDistanceFactor4;

	float lowFreqFactor = mixLowFreq ? 1.0 : 0.0;
	texNormal1 *= lowFreqFactor;
	texNormal2 *= lowFreqFactor;

	vec3 final = normalize(waterSmoothNormal * (1-perturbAmplitude) + (texNormal1 + texNormal2 + texNormal3 + texNormal4) * perturbAmplitude);

	return final;
}

#endif // WATER_SURFACE_GLSL
