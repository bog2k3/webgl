#version 100

precision mediump float;
precision mediump int;

#include common.glsl

attribute vec3 pos;
attribute float fog;

varying vec3 fWPos;
varying float fFog;
varying vec3 fScreenUV;

void main() {
	gl_Position = vec4(pos, 1) * matVP;
	fScreenUV = gl_Position.xyw;
	fWPos = pos;
	fFog = fog;
}
