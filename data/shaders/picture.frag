#version 330 core

uniform float blendFactor;
uniform int blendMode;
uniform int mulTextureAlpha;
uniform vec4 blendColor;
uniform int gammaCorrection;
uniform sampler2D texPicture;

in VertexData {
	vec2 uv;
} fragIn;

const int BLEND_MODE_NORMAL = 0;
const int BLEND_MODE_ADD = 1;
const int BLEND_MODE_MULTIPLY = 2;

void main() {
	vec4 texColor = texture(texPicture, fragIn.uv);
	float factor = blendFactor;
	factor *= mulTextureAlpha > 0 ? texColor.a : 1.0;

	vec4 color = blendColor;

	if (blendMode == BLEND_MODE_NORMAL)
		color = mix(color, texColor, factor);
	else if (blendMode == BLEND_MODE_ADD)
		color += texColor * factor;
	else if (blendMode == BLEND_MODE_MULTIPLY)
		color *= texColor * factor;

	float gamma = gammaCorrection != 0 ? 2.2 : 1.0;
	color.rgb = pow(color.rgb, vec3(1.0 / gamma));

	gl_FragColor = color;
}
