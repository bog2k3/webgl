export let context2d: CanvasRenderingContext2D;
let nextTextY = 15;

export type Render2dConfig = {
	drawDebugText: boolean;
};

export function setContext2d(context: CanvasRenderingContext2D): void {
	context2d = context;
}

export function render2D(config: Render2dConfig): void {
	nextTextY = 15; // reset
	if (config.drawDebugText) {
		drawDebugInfo();
	}
}

function drawDebugInfo(): void {
	context2d.font = "14px sans-serif";
	context2d.fillStyle = "#fff";
	printText("Click on canvas to capture input");
	printText("TAB toggles between free-camera and player camera");
	printText("W,A,S,D to move around");
	printText("R to reset car");
	printText("Click to fire a projectile");
	printText("SPACE to pause/unpause game");
	printText("Right-click to move up (in free-camera mode)");
	printText("CTRL to move down (in free-camera mode)");
}

function printText(text: string): void {
	context2d.fillText(text, 10, nextTextY);
	nextTextY += 15;
}
