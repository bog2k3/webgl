#version 100

precision mediump float;
precision mediump int;

#include common.glsl

attribute vec3 pos;

varying vec3 fUV;

uniform mat4 matVP_inverse;

void main(){
	vec4 projected = vec4(pos, 1);
	projected.z = projected.w - 0.0000001; // move the vertex back to the far clipping plane
	gl_Position = projected;

	projected.z = 0.0;
	fUV = normalize((projected * matVP_inverse).xyz - eyePos);
}
