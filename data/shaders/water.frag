#version 100

precision highp float;
precision mediump int;

#include common.glsl
#include underwater.glsl

varying vec3 fWPos;
varying vec3 fNormal;
varying float fFog;
varying vec3 fScreenUV;

uniform float screenAspectRatio;
uniform sampler2D textureReflection;
uniform sampler2D textureRefraction;
uniform samplerCube textureRefractionCube;
uniform sampler2D textureFoam;

float fresnel(vec3 normal, vec3 incident, float n1, float n2) {
	// original fresnel code:
/*
	float r0 = (n1-n2) / (n1+n2);
	r0 *= r0;
	float cosX = -dot(normal, incident);
	if (n1 > n2)
	{
		float n = n1/n2;
		float sinT2 = n*n*(1.0-cosX*cosX);
		// Total internal reflection
		if (sinT2 > 1.0)
			return 1.0;
		cosX = sqrt(1.0-sinT2);
	}
	float x = 1.0 - cosX;
	float fres = r0 + (1.0-r0) * pow(x, 5);
	return fres;
*/
	// code adapted without branching:
	float r0 = (n1-n2) / (n1+n2);
	r0 *= r0;
	float cosX = -dot(normal, incident);
	float n = n1/n2;
	float sinT2 = n*n*(1.0-cosX*cosX);
	float cosXN1gtN2 = sqrt(1.0-min(1.0, sinT2));
	cosX = mix(cosX, cosXN1gtN2, sign(n1 - n2) * 0.5 + 0.5);
	float x = 1.0 - cosX;
	// float fres = r0 + (1.0-r0) * pow(x, 5.0);
	float fres = r0 + (1.0-r0) * pow(x, 2.0);
	return max(0.0, min(1.0, fres));
}

vec4 underToAboveTransm(vec3 normal, vec2 screenCoord, float dxyW, vec3 eyeDir, float eyeDist, out vec3 foamColor) {
	vec4 refractTarget = texture2D(textureRefraction, screenCoord);
	//float targetZ = Zn + (Zf - Zn) * refractTarget.a;
	//float targetDist = sqrt(targetZ*targetZ * (1 + dxyW*dxyW / (Zn*Zn)));
	//float targetDistUW = targetDist - eyeDist; // distance through water to target 0
	vec3 T = refract(-eyeDir, normal, 1.0 / n_water);
	// float targetDepth = -(refractTarget.a - 0.5) * 100.0;
	float targetDepth = refractTarget.a * 10.0;
	float h_d = dot(-T, waterSmoothNormal);
	float t0 = acos(h_d);
	float targetDistUW = targetDepth / h_d;
	float targetDist = eyeDist + targetDistUW;

	//float targetDepth = targetDistUW * dot(T, -waterSmoothNormal);
	float t_t0 = acos(dot(-T, normal)) - t0;
	float displacement = Zn * (targetDist - eyeDist) * tan(t_t0) / targetDist;
	float transmitSampleOutsideFactor = targetDepth > 50.0 ? 0.0 : 1.0;

	vec3 w_perturbation = (normal-waterSmoothNormal) * displacement * 40.0;
	vec2 s_perturbation = (vec4(w_perturbation, 0) * matVP).xy * 5.0;
	s_perturbation *= pow(clamp(targetDepth*0.4, 0.0, 1.0), 1.0) * transmitSampleOutsideFactor;
	vec2 sampleCoord = screenCoord + s_perturbation;
	vec3 transmitColor = texture2D(textureRefraction, sampleCoord).rgb;

	foamColor = transmitColor;

	float fresnelFactor = 1.0 - fresnel(normal, -T, n_water, n_air);

	return vec4(transmitColor * fresnelFactor, targetDistUW * 0.1);
	// return vec4(transmitColor * fresnelFactor, -targetDepth / 10.0);
}

vec4 aboveToUnderTransm(vec3 normal, vec3 eyeDir, float eyeDist, out vec3 foamColor) {
	vec3 T = refract(-eyeDir, -normal, n_water);
	vec4 refractTarget = textureCube(textureRefractionCube, T);

	foamColor = vec3(1.0);

	float fresnelFactor = 1.0 - fresnel(normal, -T, n_air, n_water);

	vec3 refractColor = refractTarget.rgb * fresnelFactor;

	// simulate light absorbtion through water
	vec3 lightHalveDist = vec3(2.0, 3.0, 4.0) * 1.5; // after how many meters of water each light component is halved
	vec3 absorbFactor = 1.0 / pow(vec3(2.0), vec3(eyeDist) / lightHalveDist);
	refractColor *= absorbFactor;

	return vec4(refractColor, eyeDist);
}

vec4 reflection(vec3 normal, vec2 screenCoord, vec3 eyeDir, float eyeDist) {
	float r_r0 = acos(dot(-eyeDir, normal)) - acos(dot(-eyeDir, waterSmoothNormal));
	float d_amp = 2.0; // displacement amplitude
	float ds = 0.02;	// distance scale
	float dp = 0.5;	// distance power
	float displacement = d_amp * sin(r_r0) / (1.0 + pow(eyeDist * ds, dp));
	vec2 s_perturb = (vec4(normal - waterSmoothNormal, 0) * matVP).xy * displacement;
	vec2 reflectCoord = vec2(1.0 - screenCoord.x, screenCoord.y) + s_perturb;

	vec4 reflectColor = texture2D(textureReflection, reflectCoord);
	return reflectColor;
}

// compute reflection above water surface
vec3 aboveReflection(vec3 normal, vec2 screenCoord, vec3 eyeDir, float eyeDist) {
	vec4 reflectColor = reflection(normal, screenCoord, eyeDir, eyeDist);
	float reflectFresnelFactor = fresnel(normal, -eyeDir, n_air, n_water);
	reflectColor.xyz *= reflectFresnelFactor;

	return reflectColor.xyz;
}

// compute reflection below water surface
vec3 belowReflection(vec3 normal, vec2 screenCoord, vec3 eyeDir, float eyeDist) {
	vec4 reflectColor = reflection(normal, screenCoord, eyeDir, eyeDist);
	float reflectFresnelFactor = fresnel(-normal, -eyeDir, n_water, n_air);
	reflectColor.xyz *= reflectFresnelFactor;

	return reflectColor.xyz;
}

void main() {
	vec3 eyeDir = eyePos - fWPos;
	float eyeDist = length(eyeDir);
	eyeDir /= eyeDist; // normalize
	float angleNormalFactor = 1.0; //pow(abs(dot(eyeDir, waterSmoothNormal)), 0.9);

// normal:
	float perturbAmplitude = angleNormalFactor * (eyePos.y > 0.0 ? 0.6 : 1.0);
	vec3 normal = computeWaterNormal(fWPos.xz, time * 1.0, eyeDist, perturbAmplitude, true);
	//normal = waterSmoothNormal;

// other common vars:
	bool isCameraUnderWater = eyePos.y < 0.0;
	vec2 screenCoord = fScreenUV.xy / fScreenUV.z * 0.5 + 0.5;
	float dxy = length((screenCoord * 2.0 - 1.0) * vec2(screenAspectRatio, 1.0)); // screen-space distance from center
	float dxyW = dxy * Zn * tan(fov.x * 0.5);// world-space distance from screen center at near-z plane

	vec3 foamLight;
// refraction:
	vec4 transmitData = isCameraUnderWater
		? aboveToUnderTransm(normal, eyeDir, eyeDist, foamLight)
		: underToAboveTransm(normal, screenCoord, dxyW, eyeDir, eyeDist, foamLight);
	vec3 transmitColor = transmitData.xyz;
	float transmitUWDist = max(0.0, transmitData.w);
	//transmitUWDist = transmitUWDist > 10 && transmitUWDist > eyeDist * 5 ? 0 : transmitUWDist;

// reflection
	vec3 reflectColor = isCameraUnderWater
		? belowReflection(normal, screenCoord, eyeDir, eyeDist)
		: aboveReflection(normal, screenCoord, eyeDir, eyeDist);
	//reflectColor = vec3(0);

	vec3 reflectTint = normalize(vec3(0.55, 0.6, 0.65)) * 1.5;
	reflectColor.xyz *= reflectTint;

// mix reflection and refraction:
	vec4 final = vec4( transmitColor + reflectColor.xyz, 1.0);

	const float lightIntensity = 2.0;
	const vec3 waterColor = vec3(0.03, 0.08, 0.1) * lightIntensity;
	float fogFactor = isCameraUnderWater ? clamp(1.0 - 1.0 / (eyeDist * 0.2 + 1.0), 0.0, 1.0) : 0.0;
	float depthFactor = pow(1.0 / (max(0.0, -eyePos.y) + 1.0), 0.5);
	final.rgb = mix(final.rgb, waterColor * depthFactor, fogFactor);

// foam at water edges
	float foamTile1 = 1.0;
	float foamTile2 = 5.0;
	vec4 foamSamp1 = texture2D(textureFoam, fWPos.xz * foamTile1 + time * 0.2 * vec2(0.0101020, 0.0987987));
	vec4 foamSamp2 = texture2D(textureFoam, fWPos.xz * foamTile2 - time * 2.0 * vec2(0.09859954, 0.112345));
	float foamTransp = (foamSamp1 + foamSamp2).x * 0.5;
	foamTransp = pow(abs(foamTransp - 0.38) * 3.0, 1.5);
	float foamFactor = pow(1.0 / (1.0 + transmitUWDist), 20.0);
	vec3 foamColor = vec3(1.0, 0.95, 0.85);
	float foamLight_gs = (foamLight.x + foamLight.y + foamLight.z) * 0.6;

	// testing:
	foamFactor = pow(foamFactor * 1.1, 3.0);

	final.rgb = mix(final.rgb, foamColor * foamLight_gs, foamFactor * foamTransp);

	// final.rgb = vec3(foamFactor * foamTransp);// * foamTransp;

// fade out far edges of water
	float alpha = 1.0 - pow(fFog, 3.0);
	final.a = isCameraUnderWater ? 1.0 : alpha;

// DEBUG:
	// final = vec4(normal.xyz, 1);
	//float f = pow(abs((T_targetElevation - transmitElevation) / T_targetElevation), 2.2);
	//float f = pow(foamTransp, 2.2);
	//final = vec4(f, f, f, 1.0) + 0.00001 * final;
	//final = vec4(reflectColor.rgb, 1.0) + 0.00001 * final;
	//final.a = 0.00001;
	//final.rgb = vec3(1, 0, 0) + final.rgb*0.0001;

	gl_FragColor = final;
}
