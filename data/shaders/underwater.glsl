#ifndef UNDERWATER_GLSL
#define UNDERWATER_GLSL

#include common.glsl
#include water-surface.glsl

float approxRefractFn(float i0, float hr) {
	float r = 1.0 - 2.7 * i0 / PI;
	float p = 1.3 / (r+1) + pow(0.04 / hr, 2.0);
	r = pow(r, p);
	return clamp(r, 0, 1);
}

vec3 approxW(vec3 V, vec3 P, float i0, vec3 Wlim, vec3 P0, float n1, float n2, vec3 N) {
	float vh = V.y;
	float ph = -P.y;
	float hr = max(0.1, vh / (1 + ph));
	float r = approxRefractFn(i0, hr);
	return Wlim + (P0 - Wlim) * r;
}

const float n_air = 1.0;
const float n_water = 1.33;
float t_lim = asin(n_air / n_water);
float tan_tLim = tan(t_lim);

const float ambientLightMixDistance = 1;
const vec3 lightHalveDist = vec3(2.0, 3.0, 4.0) * 2; // after how many meters of water each light component is halved
const float causticTextureTile = 0.5;

vec3 refractPos(vec3 wPos, vec3 eyePos) {
	vec3 wPos0 = vec3(wPos.x, 0, wPos.z);
	vec3 V0 = vec3(eyePos.x, 0, eyePos.z);
	float i0 = acos(dot(normalize(eyePos - wPos), waterSmoothNormal));
	float tan_lim = tan_tLim;//i0 > t_lim ? tan_tLim : tan(i0);
	vec3 W_lim = wPos0 + normalize(V0 - wPos0) * tan_lim * abs(wPos.y);
	vec3 water_intersect = approxW(eyePos, wPos, i0, W_lim, wPos0, n_air, n_water, waterSmoothNormal);
	float uw_dist = length(wPos - water_intersect);
	vec3 newDir = normalize(water_intersect - eyePos);
	vec3 refracted = water_intersect + newDir * uw_dist;
	float fade_dist = 0.1;
	float depthFactor = clamp(-wPos.y / fade_dist, 0, 1); // fade refraction toward zero at water edges to avoid gaps
	vec3 final = mix(wPos, refracted, depthFactor);
	return final;
}

float computeCaustics(vec3 wPos) {
	float eyeDistForCaustic = 1.0; // eyeDist
	float causticIntensity = clamp(pow(dot(-lightDir, computeWaterNormal(wPos.xz * causticTextureTile, time * causticTextureTile, eyeDistForCaustic, 0.5, false)) * 2, 5), 0, 1);
	float causticSharpness = 15.0 / pow(1 - wPos.y, 0.9);
	causticIntensity = pow(1 - abs(causticIntensity - 0.3), causticSharpness);
	causticIntensity *= lightIntensity / 2;
	
	return causticIntensity;
}

vec3 computeLightingUnderwaterImpl(vec3 wPos, vec3 normal, float eyeDist, vec3 totalLightAtSurface) {
	// for underwater terrain, we need to simulate light absorbtion through water
	float eyeHeight = eyePos.y * (bReflection > 0 ? -1 : +1);

	float lightWaterDistance = wPos.y / lightDir.y;
	lightWaterDistance += eyeHeight < 0 ? eyeDist : 0;
	vec3 absorbFactor = 1.0 / pow(vec3(2.0), vec3(lightWaterDistance) / lightHalveDist);
	//absorbFactor = wPos.y < 0 ? absorbFactor : vec3(1.0);

	vec3 light = totalLightAtSurface * absorbFactor;

	vec3 ambientLightBelow = waterColor / pow(max(1, 1 - wPos.y), 1.5);

	light *= lightContribution(normal);

	float ambientMixFactor = clamp(wPos.y + ambientLightMixDistance, 0.0, 1.0);
	vec3 ambientLight = mix(ambientLightBelow, ambientLightAbove, ambientMixFactor);

	vec3 totalLight = light + ambientLight;
	return totalLight;
}

vec3 computeLightingUnderwaterSimple(vec3 wPos, vec3 normal) {
	vec3 lightAtSurface = lightColor * lightIntensity;
	return computeLightingUnderwaterImpl(wPos, normal, 0, lightAtSurface);
}

vec3 computeLightingUnderwater(vec3 wPos, vec3 normal, float eyeDist) {
	float causticIntensity = computeCaustics(wPos);
	vec3 lightAtSurface = lightColor * (lightIntensity + causticIntensity);
	return computeLightingUnderwaterImpl(wPos, normal, eyeDist, lightAtSurface);
}

vec3 computeWaterFog(vec3 wPos, vec3 color, float eyeDist) {
	float eyeHeight = eyePos.y * (bReflection > 0 ? -1 : +1);
	float waterThickness = eyeDist * (eyeHeight < 0 ? 1 : -wPos.y / (eyeHeight - wPos.y));
	float fogFactor = clamp(1.0 - 1.0 / (waterThickness * 0.05 + 1), 0, 1);
	float depthFactor = pow(1.0 / (max(0, -eyePos.y) + 1), 0.5);
	//fogFactor *= wPos.y < 0 ? 1.0 : 0.0;
	return mix(color.xyz, waterColor * depthFactor, fogFactor);
}

#endif // UNDERWATER_GLSL
