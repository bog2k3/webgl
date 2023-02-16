#version 100

precision mediump float;
precision mediump int;

varying vec3 fUV;

uniform samplerCube textureSky;

void main() {
	gl_FragColor = vec4(fUV.xy, 0, 1);//textureCube(textureSky, fUV);
}
