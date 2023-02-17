import { RenderContext } from "../joglfw/render/render-context";
import { ShaderProgram } from "../joglfw/render/shader-program";
import { Matrix } from "./../joglfw/math/matrix";
import { Mesh } from "./../joglfw/mesh";
import { MeshRenderer } from "./../joglfw/render/mesh-renderer";

export class CustomMeshRenderer extends MeshRenderer {
	constructor() {
		super();
		// TODO implement
		// : pRenderData_(new RenderData()) {
		// LOGPREFIX("CustomMeshRenderer::ctor");
		// Shaders::createProgramGeom("data/shaders/mesh-custom.vert", "data/shaders/watercut.geom", "data/shaders/mesh-custom.frag", [this](unsigned id) {
		// 	pRenderData_->shaderProgram_ = id;
		// 	if (pRenderData_->shaderProgram_ == 0) {
		// 		throw std::runtime_error("Unable to load custom mesh shaders!!");
		// 	}
		// 	pRenderData_->iPos = glGetAttribLocation(pRenderData_->shaderProgram_, "pos");
		// 	pRenderData_->iNorm = glGetAttribLocation(pRenderData_->shaderProgram_, "normal");
		// 	pRenderData_->iUV = glGetAttribLocation(pRenderData_->shaderProgram_, "uv");
		// 	pRenderData_->iColor = glGetAttribLocation(pRenderData_->shaderProgram_, "color");
		// 	pRenderData_->imPV = glGetUniformLocation(pRenderData_->shaderProgram_, "matPV");
		// 	pRenderData_->imW = glGetUniformLocation(pRenderData_->shaderProgram_, "matW");
		// 	pRenderData_->iEyePos = glGetUniformLocation(pRenderData_->shaderProgram_, "eyePos");
		// 	pRenderData_->iSubspace = glGetUniformLocation(pRenderData_->shaderProgram_, "subspace");
		// 	pRenderData_->ibRefraction = glGetUniformLocation(pRenderData_->shaderProgram_, "bRefraction");
		// 	pRenderData_->ibReflection = glGetUniformLocation(pRenderData_->shaderProgram_, "bReflection");
		// 	pRenderData_->iTime = glGetUniformLocation(pRenderData_->shaderProgram_, "time");
		// 	pRenderData_->iTexWaterNorm = glGetUniformLocation(pRenderData_->shaderProgram_, "textureWaterNormal");
		// 	checkGLError("getAttribs");
		// });
	}

	override release(): void {
		// TODO implement
		// if (pRenderData_->shaderProgram_)
		// 	glDeleteProgram(pRenderData_->shaderProgram_);
		// delete pRenderData_, pRenderData_ = nullptr;
	}

	override render(mesh: Mesh, worldTransform: Matrix, ctx: RenderContext): void {
		// TODO implement
		// LOGPREFIX("CustomMeshRenderer::renderMesh");
		// if (!pRenderData_->shaderProgram_)
		// 	return;
		// auto const& rctx = CustomRenderContext::fromCtx(ctx);
		// glUseProgram(pRenderData_->shaderProgram_);
		// auto matPV = rctx.viewport().camera().matProjView();
		// glUniformMatrix4fv(pRenderData_->imPV, 1, GL_FALSE, glm::value_ptr(matPV));
		// glUniformMatrix4fv(pRenderData_->imW, 1, GL_FALSE, glm::value_ptr(matW));
		// if (pRenderData_->iEyePos >= 0)
		// 	glUniform3fv(pRenderData_->iEyePos, 1, &ctx.viewport().camera().position().x);
		// if (pRenderData_->iSubspace >= 0)
		// 	glUniform1f(pRenderData_->iSubspace, rctx.subspace);
		// if (pRenderData_->ibRefraction >= 0)
		// 	glUniform1i(pRenderData_->ibRefraction, rctx.renderPass == RenderPass::WaterRefraction ? 1 : 0);
		// if (pRenderData_->ibReflection >= 0)
		// 	glUniform1i(pRenderData_->ibReflection, rctx.renderPass == RenderPass::WaterReflection ? 1 : 0);
		// if (pRenderData_->iTime >= 0)
		// 	glUniform1f(pRenderData_->iTime, rctx.time);
		// if (pRenderData_->waterNormalTex) {
		// 	glActiveTexture(GL_TEXTURE1);
		// 	glBindTexture(GL_TEXTURE_2D, pRenderData_->waterNormalTex);
		// 	glUniform1i(pRenderData_->iTexWaterNorm, 1);
		// }
		// checkGLError("uniforms setup");
		// glBindVertexArray(mesh.getVAO());
		// if (mesh.vertexAttribsProgramBinding_ != pRenderData_->shaderProgram_) {
		// 	glBindBuffer(GL_ARRAY_BUFFER, mesh.getVBO());
		// 	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, mesh.getIBO());
		// 	glEnableVertexAttribArray(pRenderData_->iPos);
		// 	glEnableVertexAttribArray(pRenderData_->iNorm);
		// 	glEnableVertexAttribArray(pRenderData_->iUV);
		// 	glEnableVertexAttribArray(pRenderData_->iColor);
		// 	glVertexAttribPointer(pRenderData_->iPos, 3, GL_FLOAT, GL_FALSE, sizeof(Mesh::s_Vertex), (void*)offsetof(Mesh::s_Vertex, position));
		// 	glVertexAttribPointer(pRenderData_->iNorm, 3, GL_FLOAT, GL_FALSE, sizeof(Mesh::s_Vertex), (void*)offsetof(Mesh::s_Vertex, normal));
		// 	glVertexAttribPointer(pRenderData_->iUV, 2, GL_FLOAT, GL_FALSE, sizeof(Mesh::s_Vertex), (void*)offsetof(Mesh::s_Vertex, UV1));
		// 	glVertexAttribPointer(pRenderData_->iColor, 4, GL_FLOAT, GL_FALSE, sizeof(Mesh::s_Vertex), (void*)offsetof(Mesh::s_Vertex, color));
		// 	mesh.vertexAttribsProgramBinding_ = pRenderData_->shaderProgram_;
		// 	checkGLError("attrib arrays setup");
		// }
		// // decide what to draw:
		// unsigned drawMode = 0;
		// switch (mesh.getRenderMode()) {
		// 	case Mesh::RENDER_MODE_POINTS:
		// 		drawMode = GL_POINTS; break;
		// 	case Mesh::RENDER_MODE_LINES:
		// 		drawMode = GL_LINES; break;
		// 	case Mesh::RENDER_MODE_TRIANGLES:
		// 	case Mesh::RENDER_MODE_TRIANGLES_WIREFRAME:
		// 		drawMode = GL_TRIANGLES; break;
		// 	default:
		// 		assertDbg(false && "Unknown mesh draw mode!");
		// }
		// if (mesh.getRenderMode() == Mesh::RENDER_MODE_TRIANGLES_WIREFRAME || mesh.getRenderMode() == Mesh::RENDER_MODE_LINES) {
		// 	glLineWidth(2.f);
		// }
		// if (mesh.getRenderMode() == Mesh::RENDER_MODE_TRIANGLES_WIREFRAME) {
		// 	glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
		// }
		// glDrawElements(drawMode, mesh.getElementsCount(), GL_UNSIGNED_SHORT, 0);
		// checkGLError("mesh draw");
		// glBindVertexArray(0);
		// if (mesh.getRenderMode() == Mesh::RENDER_MODE_TRIANGLES_WIREFRAME || mesh.getRenderMode() == Mesh::RENDER_MODE_LINES) {
		// 	glLineWidth(1.f);
		// }
		// if (mesh.getRenderMode() == Mesh::RENDER_MODE_TRIANGLES_WIREFRAME) {
		// 	glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);
		// }
	}

	setWaterNormalTexture(texture: WebGLTexture): void {
		this.renderData.waterNormalTex = texture;
	}

	private renderData = new CustomMeshRenderData();
}

class CustomMeshRenderData {
	shaderProgram_: ShaderProgram;
	iPos: number;
	iNorm: number;
	iUV: number;
	iColor: number;
	imPV: WebGLUniformLocation;
	imW: WebGLUniformLocation;

	iEyePos: WebGLUniformLocation;
	iSubspace: WebGLUniformLocation;
	ibRefraction: WebGLUniformLocation;
	ibReflection: WebGLUniformLocation;
	iTime: WebGLUniformLocation;
	iTexWaterNorm: WebGLUniformLocation;

	waterNormalTex: WebGLTexture;
}
