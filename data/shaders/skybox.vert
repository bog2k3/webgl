#version 100

precision mediump float;
precision mediump int;

#include common.glsl

attribute vec3 pos;

varying vec3 fUV;

void main(){
	vec4 projected = vec4(pos, 1);
	projected.z = projected.w - 0.0000001; // move the vertex back to the far clipping plane
	gl_Position = projected;

	vec3 camX = matView[0].xyz;
	vec3 camY = matView[1].xyz;
	vec3 camZ = matView[2].xyz;
	float dV = tan(fov.x * 0.5);
	float dU = dV * fov.y;
	fUV = normalize(camZ + camX * dU * pos.x + camY * dV * pos.y);
}
