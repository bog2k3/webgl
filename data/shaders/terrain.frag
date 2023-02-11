#version 100
precision mediump float;
precision mediump int;

#include underwater.glsl
#include terrain-texture.glsl

varying vec3 fWPos;
varying vec3 fNormal;
varying vec3 fColor;
varying vec2 fUV[5];
varying vec4 fTexBlendFactor;

uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3;
uniform sampler2D tex4;
uniform sampler2D tex5;

void main() {
	float lowFreqFactor = 0.05;
	// sample textures at two frequencies:
	vec4 t0 = texture2D(tex1, fUV[0]);
	vec4 t0low = texture2D(tex1, fUV[0] * lowFreqFactor);
	vec4 t1 = texture2D(tex2, fUV[1]);
	vec4 t1low = texture2D(tex2, fUV[1] * lowFreqFactor);
	vec4 t2 = texture2D(tex3, fUV[2]);
	vec4 t2low = texture2D(tex3, fUV[2] * lowFreqFactor);
	vec4 t3 = texture2D(tex4, fUV[3]);
	vec4 t3low = texture2D(tex4, fUV[3] * lowFreqFactor);
	vec4 t4 = texture2D(tex5, fUV[4]);
	vec4 t4low = texture2D(tex5, fUV[4] * lowFreqFactor);

	// mix texture frequencies
	t0 = t0 * t0low * 2.8;
	t1 = t1 * t1low * 2.8;
	t2 = t2 * t2low * 2.8;
	t3 = t3 * t3low * 2.8;
	t4 = t4 * t4low * 2.8;

	// blend the textures:
	vec3 texColor = mixTerrainTextures(t0, t1, t2, t3, t4, fTexBlendFactor).xyz;

	float eyeDist = length(eyePos - fWPos);

	bool underwater = subspace < 0.0;
	// compute lighting
	vec3 light = underwater ? computeLightingUnderwater(fWPos, normalize(fNormal), eyeDist) : computeLightingAboveWater(normalize(fNormal));
	vec3 color = light * fColor.xyz * texColor;

	// water fog:
	if (underwater)
		color = computeWaterFog(fWPos, color, eyeDist);

	vec4 final = vec4(color, 1.0);
	// if (bRefraction > 0 || bReflection > 0)
	// 	final.a = (fWPos.y / 200.0) + 0.5;
	// 	final.a = computeZValue(gl_FragCoord);

	// final = vec4(texColor, 1.0);

	// do gamma correction
	float gamma = 2.2;
	vec3 gamma_inv = vec3(1.0 / gamma);
	final.xyz = pow(final.xyz, gamma_inv);

	gl_FragColor = final;
}
