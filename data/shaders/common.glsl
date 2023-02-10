#ifndef COMMON_GLSL
#define COMMON_GLSL

#define PI 3.1415

const float Zn = 0.15;
const float Zf = 1000.0;
const float fov = PI/2.5; // vertical field of view
const float waterLevel = 0;
const float lightIntensity = 2.0;
vec3 lightColor = normalize(vec3(1.0, 0.95, 0.9));
vec3 lightDir = normalize(vec3(2.0, -1.0, -0.9));
vec3 waterColor = vec3(0.03, 0.08, 0.1) * lightIntensity;
vec3 ambientLightAbove = vec3(0.01, 0.02, 0.05) * 2 * lightIntensity;

uniform vec3 eyePos;
uniform int bEnableClipping; // enable clipping against subspace
uniform float subspace;	// represents the subspace we're rendering: +1 above water, -1 below water
uniform int bRefraction;
uniform int bReflection;
uniform float time;

uniform mat4 matPV;	// proj-view matrix

float lightContribution(vec3 normal) {
	return max(dot(-lightDir, normal), 0.0);
}

vec3 computeLightingAboveWater(vec3 normal) {
	vec3 light = lightColor * lightIntensity * lightContribution(normal);
	return light + ambientLightAbove;
}

float computeZValue(vec4 fragCoord) {
	return clamp((fragCoord.z / fragCoord.w - Zn) / (Zf - Zn), 0.0, 1.0);
}

#endif // COMMON_GLSL
