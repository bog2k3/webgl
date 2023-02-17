#version 100

precision highp float;
precision mediump int;

varying vec4 fColor;

void main() {
	gl_FragColor = fColor;
}
