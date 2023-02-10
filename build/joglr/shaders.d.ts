export declare namespace Shaders {
    enum Type {
        Vertex = "vertex",
        Fragment = "fragment"
    }
    function createAndCompileShader(code: string, shaderType: Type): WebGLShader;
    function createProgram(vertexShaderCode: string, fragmentShaderCode: string): WebGLProgram;
}
