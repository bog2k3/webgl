#version 100
precision mediump float;

#include underwater.glsl
#include terrain-texture.glsl

varying vec3 fWPos;
varying vec3 fNormal;
varying vec3 fColor;
varying vec2 fUV[5];
varying vec4 fTexBlendFactor;

uniform sampler2D tex[5];

void main() {
	float lowFreqFactor = 0.05;
	vec4 t0 = texture2D(tex[0], fUV[0] * lowFreqFactor);
	vec4 t1 = texture2D(tex[1], fUV[1] * lowFreqFactor);
	vec4 t2 = texture2D(tex[2], fUV[2] * lowFreqFactor);
	vec4 t3 = texture2D(tex[3], fUV[3] * lowFreqFactor);
	vec4 t4 = texture2D(tex[4], fUV[4] * lowFreqFactor);

	// blend the textures:
	vec4 texColor = mixTerrainTextures(t0, t1, t2, t3, t4, fTexBlendFactor);

	float eyeDist = length(eyePos - frag.wPos);

	// compute lighting
	bool underwater = frag.wPos.y < 0.0;
	vec3 light = underwater ? computeLightingUnderwaterSimple(frag.wPos, normalize(frag.normal)) : computeLightingAboveWater(normalize(frag.normal));

	vec3 color = light * (vec4(frag.color, 1) * texColor).xyz;
	float gamma = 2.2;
	color.rgb = pow(color.rgb, vec3(1.0 / gamma));
	vec4 final = vec4(color, 1);

	gl_FragColor = final;
}
