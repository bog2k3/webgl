precision mediump float;

varying vec4 fColor;
varying vec2 fUV1;
varying vec3 fNormal;

uniform sampler2D tex1;

void main() {
	vec4 dummy = fColor + vec4(fUV1, 0, 0) + vec4(fNormal, 0);
	gl_FragColor = vec4(1, 0, 0, 1); //fColor + dummy*0.01;// * texture(2Dtex1, fUV1);
}
