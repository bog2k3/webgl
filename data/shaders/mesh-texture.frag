in vec4 fColor;
in vec2 fUV1;
in vec3 fNormal;

uniform sampler2D tex1;

void main() {
	vec4 dummy = fColor + vec4(fUV1, 0, 0) + vec4(fNormal, 0);
	gl_FragColor = fColor + dummy*0.01;// * texture(tex1, fUV1);
}
