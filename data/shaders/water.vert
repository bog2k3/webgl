#version 330 core

#include common.glsl

in vec3 pos;
in float fog;

out vec3 fWPos;
out float fFog;
out vec3 fScreenUV;

void main() {
   	gl_Position = matPV * vec4(pos, 1);
	fScreenUV = gl_Position.xyw;
	fWPos = pos;
   	fFog = fog;
}
