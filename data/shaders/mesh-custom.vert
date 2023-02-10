#version 330 core

#include common.glsl
#include underwater.glsl

in vec3 pos;
in vec3 normal;
in vec4 color;
in vec2 uv;

out VertexData {
	vec3 normal;
	vec3 color;
	vec2 uv[5];
	vec4 texBlendFactor;
} vertexOut;

uniform mat4 matW;

void main() {
	vec3 wPos = (matW * vec4(pos, 1)).xyz;
	gl_Position = vec4(wPos, 1);
	gl_ClipDistance[0] = bEnableClipping != 0 
		? wPos.y * sign(subspace) 
		: 1.0;

    vertexOut.normal = (matW * vec4(normal, 0)).xyz;
    vertexOut.color = color.xyz;
    vertexOut.uv[0] = uv;
}
