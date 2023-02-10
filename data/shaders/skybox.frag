#version 330 core

in vec3 fUV;

uniform samplerCube textureSky;

void main() {
	gl_FragColor = texture(textureSky, fUV);
}
