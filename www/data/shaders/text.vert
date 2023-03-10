#version 120

// Input vertex data, different for all executions of this shader.
attribute vec2 vertexPosition_screenspace;
attribute vec2 vertexUV;
attribute vec4 vertexColor;

uniform vec2 viewportHalfSize;
uniform vec2 translation;

// Output data ; will be interpolated for each fragment.
varying vec2 UV;
varying vec4 color;

void main(){

	// Output position of the vertex, in clip space
	// map [0..vW][0..vH] to [-1..1][-1..1]
	vec2 vertexPosition_homoneneousspace = vertexPosition_screenspace + translation - viewportHalfSize + 0.5f;
	vertexPosition_homoneneousspace.y *= -1;
	vertexPosition_homoneneousspace /= viewportHalfSize;
	gl_Position = vec4(vertexPosition_homoneneousspace, 0, 1);
	
	// UV of the vertex. No special space for this one.
	UV = vertexUV;
	color = vertexColor;
}

