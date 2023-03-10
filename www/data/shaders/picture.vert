#version 330 core

in vec3 pos;
in vec2 uv;

out VertexData {
	vec2 uv;
} vertexOut;

uniform mat4 matV2U;

void main() {
    gl_Position = matV2U * vec4(pos, 1);
	vertexOut.uv = uv;
}
