#version 330 core

#include underwater.glsl
#include terrain-texture.glsl

in FragData {
	vec3 wPos;
	vec3 normal;
	vec4 color;
	vec2 uv[5];
	vec4 texBlendFactor;
} frag;

uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3;
uniform sampler2D tex4;
uniform sampler2D tex5;

void main() {
	float lowFreqFactor = 0.05;
	// sample textures at two frequencies:
	vec4 t0 = texture2D(tex[0], frag.uv[0]);
	vec4 t0low = texture2D(tex[0], frag.uv[0] * lowFreqFactor);
	vec4 t1 = texture2D(tex[1], frag.uv[1]);
	vec4 t1low = texture2D(tex[1], frag.uv[1] * lowFreqFactor);
	vec4 t2 = texture2D(tex[2], frag.uv[2]);
	vec4 t2low = texture2D(tex[2], frag.uv[2] * lowFreqFactor);
	vec4 t3 = texture2D(tex[3], frag.uv[3]);
	vec4 t3low = texture2D(tex[3], frag.uv[3] * lowFreqFactor);
	vec4 t4 = texture2D(tex[4], frag.uv[4]);
	vec4 t4low = texture2D(tex[4], frag.uv[4] * lowFreqFactor);

	// mix texture frequencies
	t0 = t0 * t0low * 2.5;
	t1 = t1 * t1low * 2.5;
	t2 = t2 * t2low * 2.5;
	t3 = t3 * t3low * 2.5;
	t4 = t4 * t4low * 2.5;

	// blend the textures:
	vec3 texColor = vec3(0.5); //mixTerrainTextures(t0, t1, t2, t3, t4, frag.texBlendFactor).xyz;

	float eyeDist = length(eyePos - frag.wPos);

	bool underwater = subspace < 0;

	// compute lighting
	vec3 light = underwater ? computeLightingUnderwater(frag.wPos, normalize(frag.normal), eyeDist) : computeLightingAboveWater(normalize(frag.normal));

	vec3 color = light * frag.color.xyz * texColor;

	// water fog:
	if (underwater)
		color = computeWaterFog(frag.wPos, color, eyeDist);

	vec4 final = vec4(color, 1);
	if (bRefraction > 0 || bReflection > 0)
		final.a = (frag.wPos.y / 200) + 0.5;
		// final.a = computeZValue(gl_FragCoord);

	gl_FragColor = final;
}
