#version 300 es

in vec3 vPos;
in vec3 vNormal;
in vec4 vColor;
in vec2 vUV1;

out vec4 fColor;
out vec2 fUV1;
out vec3 fNormal;

uniform mat4 mPVW;

void main() {
    gl_Position = mPVW * vec4(vPos, 1);
    fNormal = (mPVW * vec4(vNormal, 0)).xyz;
    fColor = vColor;
    fUV1 = vUV1;
}
