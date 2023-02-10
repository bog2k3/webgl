#version 330 core

#include common.glsl

in vec3 pos;
in vec3 normal;
in vec4 color;
in vec4 uv1;
in vec4 uv2;
in vec2 uv3;
in vec4 texBlendFactor;

out FragData {
	vec3 wPos;
	vec3 normal;
	vec3 color;
	vec2 uv[5];
	vec4 texBlendFactor;
} vertexOut;

void main() {
	gl_Position = matPV * vec4(pos, 1);
	gl_ClipDistance[0] = 1;

	vertexOut.wPos = pos;
	vertexOut.normal = normal;
	vertexOut.color = color.xyz;
	vertexOut.uv = vec2[5](uv1.xy, uv1.zw, uv2.xy, uv2.zw, uv3.xy);
	vertexOut.texBlendFactor = texBlendFactor;
}
