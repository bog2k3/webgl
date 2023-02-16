#version 100

precision mediump float;
precision mediump int;

#include common.glsl

attribute vec3 pos;

varying vec3 fUV;

void main(){
	vec4 projected = vec4(pos, 1);
	projected.z = projected.w; // move the vertex back to the far clipping plane
	gl_Position = projected;
	fUV = pos;
}
