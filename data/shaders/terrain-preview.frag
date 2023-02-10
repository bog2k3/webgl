#version 330 core

#include underwater.glsl
#include terrain-texture.glsl

in FragData {
	vec3 wPos;
	vec3 normal;
	vec3 color;
	vec2 uv[5];
	vec4 texBlendFactor;
} frag;

uniform sampler2D tex[5];

void main() {
	float lowFreqFactor = 0.05;
	vec4 t0 = texture(tex[0], frag.uv[0] * lowFreqFactor);
	vec4 t1 = texture(tex[1], frag.uv[1] * lowFreqFactor);
	vec4 t2 = texture(tex[2], frag.uv[2] * lowFreqFactor);
	vec4 t3 = texture(tex[3], frag.uv[3] * lowFreqFactor);
	vec4 t4 = texture(tex[4], frag.uv[4] * lowFreqFactor);

	// blend the textures:
	vec4 texColor = mixTerrainTextures(t0, t1, t2, t3, t4, frag.texBlendFactor);

	float eyeDist = length(eyePos - frag.wPos);

	// compute lighting
	bool underwater = frag.wPos.y < 0;
	vec3 light = underwater ? computeLightingUnderwaterSimple(frag.wPos, normalize(frag.normal)) : computeLightingAboveWater(normalize(frag.normal));

	vec3 color = light * (vec4(frag.color, 1) * texColor).xyz;
	float gamma = 2.2;
	color.rgb = pow(color.rgb, vec3(1.0 / gamma));
	vec4 final = vec4(color, 1);

	gl_FragColor = final;
}
