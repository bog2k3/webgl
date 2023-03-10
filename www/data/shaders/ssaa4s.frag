#version 330 core

in vec2 fragUV;

uniform sampler2D frameBufferTexture;
uniform vec2 sampleOffsets[4];

out vec4 color;

void main(){
	vec4 color0 = texture2D(frameBufferTexture, fragUV + sampleOffsets[0]);
	vec4 color1 = texture2D(frameBufferTexture, fragUV + sampleOffsets[1]);
	vec4 color2 = texture2D(frameBufferTexture, fragUV + sampleOffsets[2]);
	vec4 color3 = texture2D(frameBufferTexture, fragUV + sampleOffsets[3]);

	color = (color0+color1+color2+color3) * 0.25;
}
