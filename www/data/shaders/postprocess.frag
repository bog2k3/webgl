#version 330 core

in vec2 fragUV;

uniform sampler2D texSampler;
uniform int underwater;
uniform vec2 texSize_inv;
uniform float time;

out vec4 color;

vec3 blur(vec2 uv) {
	/*const int kernelSize = 8;
	vec3 sampleKernel[kernelSize] = vec2[kernelSize] (
		vec2(-1, -1) * texSize_inv * 2,
		vec2(0, -1) * texSize_inv * 2,
		vec2(1, -1) * texSize_inv * 2,
		vec2(-1, 0) * texSize_inv * 2,
		vec2(1, 0) * texSize_inv * 2,
		vec2(-1, 1) * texSize_inv * 2,
		vec2(0, 1) * texSize_inv * 2,
		vec2(1, 1) * texSize_inv * 2
	);
	vec3 val = center;
	for (int i=0; i<kernelSize; i++)
		val += texture2D(texSampler, uv + sampleKernel[i]).xyz;
	return val / (kernelSize + 1);*/

	//return texture2D(texSampler, uv).rgb;

	const vec2 wave_density = vec2(3, 2); // periods per screen w/h
	const vec2 wave_amplitude = vec2(4, 4); // pixels
	const float PI = 3.1415;
	float wave_speed = 2; // rad/s

	vec2 duv = vec2(sin(uv.y * 2*PI * wave_density.y + time * wave_speed) * wave_amplitude.x,
		sin(uv.x * 2*PI * wave_density.x + time * wave_speed) * wave_amplitude.y) * texSize_inv;

	vec3 val = vec3(0);
	float div = 0.0;
	for (int i=-4; i<=4; i++) {
		for (int j=-4; j<4; j++) {
			float r = sqrt(float(i*i+j*j));
			float r_inv = 1.f / (1 + r);
			div += r_inv;
			vec2 coord = uv + vec2(i, j) * texSize_inv * 3 + duv;
			val += texture2D(texSampler, coord).rgb * r_inv;
		}
	}
	return val / div;
}

void main() {
    vec3 val;
	if (underwater > 0) {
		float fovFactor = 0.7;
		val = blur(fragUV * fovFactor + (1 - fovFactor) * 0.5);
	} else
		val = texture2D(texSampler, fragUV).xyz;

	// do gamma correction
	float gamma = 2.2;
	vec3 gamma_inv = vec3(1.0 / gamma);
	val.xyz = pow(val.xyz, gamma_inv);

	color = vec4(val, 1.0);
}
