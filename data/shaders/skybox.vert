#version 330 core

#include common.glsl

in vec3 pos;

out vec3 fUV;

void main(){
	vec4 projected = matPV * vec4(pos, 0);
	projected.z = projected.w; // move the vertex back to the far clipping plane
    gl_Position = projected;
    fUV = pos;
}
