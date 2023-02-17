#version 100

precision highp float;
precision mediump int;

varying vec3 fUV;

uniform samplerCube textureSky;

void main() {
	gl_FragColor = textureCube(textureSky, fUV);
}
