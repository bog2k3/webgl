import { Camera } from "./camera";
import { Matrix } from "./math/matrix";
import { Vector } from "./math/vector";

export class Viewport {
	constructor(
		x: number, y: number, w: number, h: number
	) {
		this.viewportArea_ = new Vector(x, y, w, h);
		this.camera_ = new Camera(this);
		this.updateVP2UMat();
	}

	bkColor(): Vector {
		return this.backgroundColor_.copy();
	}

	setBkColor(c: Vector) {
		this.backgroundColor_ = c.copy();
	}

	camera(): Camera {
		return this.camera_;
	}

	width(): number {
		return this.viewportArea_.z;
	}

	height(): number {
		return this.viewportArea_.w;
	}

	aspectRatio(): number {
		return this.width() / this.height();
	}

	position(): Vector {
		return this.viewportArea_.xy();
	}

	isEnabled(): boolean {
		return this.enabled_;
	}

	containsPoint(p: Vector): boolean {
		return p.x >= this.viewportArea_.x && p.y >= this.viewportArea_.y &&
			p.x <= this.viewportArea_.x + this.viewportArea_.z &&
			p.y <= this.viewportArea_.y + this.viewportArea_.w;
	}

	screenRect(): Vector {
		return this.viewportArea_.copy();
	}

	project(point: Vector): Vector {
		throw new Error("not implemented");
		/*
		auto matPV = camera().matProjView();
		auto unif = matPV * vec4{point, 1};
		vec3 ret { unif.x, unif.y, unif.z };
		ret *= 1.f / unif.w;
		ret.x *= viewportArea_.z * 0.5f;
		ret.y *= -viewportArea_.w * 0.5f;
		return ret + glm::vec3{viewportArea_.z * 0.5f, viewportArea_.w * 0.5f, 0};
		*/
	}

	unproject(point: Vector): Vector {
		throw new Error("not implemented");
		/*
		vec4 unif {point, 1};
		unif.x = unif.x / viewportArea_.z * 2 - 1;
		unif.y = 1 - unif.y / viewportArea_.w * 2;

		auto camPV = camera().matProjView();
		if (mPV_cache_ != camPV) {
			mPV_cache_ = camPV;
			mPV_inv_cache_ = glm::inverse(camPV);
		}

		auto ret = mPV_inv_cache_ * unif;
		return {ret.x, ret.y, ret.z};
		*/
	}

	// returns a transformation matrix from viewport space to device uniform space -> useful for drawing viewport-space stuff
	viewport2Uniform(): Matrix {
		return this.mViewport2Uniform_.copy();
	}

	setEnabled(enabled: boolean): void {
		this.enabled_ = enabled;
	}

	setArea(vpX: number, vpY: number, vpW: number, vpH: number): void {
		this.viewportArea_ = new Vector(vpX, vpY, vpW, vpH);
		this.updateVP2UMat();
		this.camera_["updateProj"]();
	}

	clear(): void {
		throw new Error("not implemented");
		/*
		SSDescriptor ssDesc;
		bool ssEnabled = gltGetSuperSampleInfo(ssDesc);
		// when super sample is enabled we must adjust the viewport accordingly
		unsigned vpfx = ssEnabled ? ssDesc.getLinearSampleFactor() : 1;
		unsigned vpfy = ssEnabled ? ssDesc.getLinearSampleFactor() : 1;
		auto vpp = position();
		glScissor(vpp.x * vpfx, vpp.y * vpfy, width() * vpfx, height() * vpfy);
		glEnable(GL_SCISSOR_TEST);
		glClearColor(backgroundColor_.r, backgroundColor_.g, backgroundColor_.b, backgroundColor_.a);
		glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
		glDisable(GL_SCISSOR_TEST);
		checkGLError("viewport clear");
		*/
	}

	renderList(list: unknown[], ctx: unknown): void {
		throw new Error("not implemented");
		/*
		if (!isEnabled())
			return;

		checkGLError("Viewport::render before prepare");
		prepareRendering(ctx);
		checkGLError("Viewport::render after prepare, before element.draw()");

		// render objects from list:
		for (auto &x : list) {
			x.draw(ctx);
			checkGLError("Viewport::render after element.draw()");
		}
		// flush all render helpers' pending commands
		RenderHelpers::flushAll();
		checkGLError("Viewport::render after flushAll()");

		resetRendering();
		checkGLError("Viewport::render end.");
		*/
	}

	public prepareForRender() {
		/*
		// set up viewport:
		assertDbg(RenderHelpers::pActiveViewport == nullptr && "Another viewport is already rendering");
		RenderHelpers::pActiveViewport = this;

		SSDescriptor ssDesc;
		bool ssEnabled = gltGetSuperSampleInfo(ssDesc);
		// when super sample is enabled we must adjust the viewport accordingly
		unsigned vpfx = ssEnabled ? ssDesc.getLinearSampleFactor() : 1;
		unsigned vpfy = ssEnabled ? ssDesc.getLinearSampleFactor() : 1;
		auto vpp = position();
		glViewport(vpp.x * vpfx, vpp.y * vpfy, width() * vpfx, height() * vpfy);

		// make sure the context is refering to this viewport:
		ctx.pViewport = this;
		*/
	}

	public resetAfterRender() {
		// RenderHelpers::pActiveViewport = nullptr;
	}

	// ----------------- PRIVATE AREA ---------------------------- //

	private viewportArea_: Vector;
	private camera_: Camera;
	private enabled_ = true;
	private backgroundColor_ = new Vector(0, 0, 0, 1);

	private mViewport2Uniform_: Matrix;
	private mPV_cache_ = Matrix.identity();
	private mPV_inv_cache_ = Matrix.identity();

	private updateVP2UMat() {
		const vpw = this.width(), vph = this.height();
		const sx = 2.0 / (vpw-1);
		const sy = -2.0 / (vph-1);
		const sz = -1.e-2;
		const matVP_to_UniformScale = Matrix.scale(sx, sy, sz);
		this.mViewport2Uniform_ = matVP_to_UniformScale.mul(Matrix.translate(new Vector(-vpw/2, -vph/2)));
			// TODO order of multiplication may be wrong
	}
};