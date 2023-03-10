#version 100

precision highp float;
precision mediump int;

#include common.glsl

attribute vec3 pos;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv1;
attribute vec2 uv2;
attribute vec2 uv3;
attribute vec2 uv4;
attribute vec2 uv5;
attribute vec4 texBlendFactor;

varying vec3 fWPos;
varying vec3 fNormal;
varying vec3 fColor;
varying vec2 fUV[5];
varying vec4 fTexBlendFactor;

void main() {
	gl_Position = vec4(pos, 1.0) * matVP;
	// gl_ClipDistance[0] = bEnableClipping != 0 ? pos.y * sign(subspace) : 1.0; // TODO manual implement using test and discard in fragment shader

	fWPos = pos;
	fNormal = normal;
	fColor = color.xyz;
	fUV[0] = uv1;
	fUV[1] = uv2;
	fUV[2] = uv3;
	fUV[3] = uv4;
	fUV[4] = uv5;
	fTexBlendFactor = texBlendFactor;
}
