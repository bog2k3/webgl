#version 330 core

#include common.glsl
#include underwater.glsl

in FragData {
	vec3 wPos;
	vec3 normal;
	vec4 color;
	vec2 uv[5];
	vec4 texBlendFactor;
} frag;

uniform sampler2D tex1;

void main() {
	vec4 dummy = frag.color + vec4(frag.uv[0], 0, 0) + vec4(frag.normal, 0);

	float eyeDist = length(eyePos - frag.wPos);
	bool underwater = subspace < 0;

	// compute lighting
	vec3 light = underwater ? computeLightingUnderwater(frag.wPos, normalize(frag.normal), eyeDist) : computeLightingAboveWater(normalize(frag.normal));

	vec3 color = light * frag.color.xyz + dummy.xyz * 0.001;

	// water fog:
	if (underwater)
		color = computeWaterFog(frag.wPos, color, eyeDist);

	vec4 final = vec4(color, 1);
	if (bRefraction > 0 || bReflection > 0)
		//final.a = computeZValue(gl_FragCoord);
		final.a = (frag.wPos.y / 200) + 0.5;

	gl_FragColor = final;
}
