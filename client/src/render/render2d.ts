import { GlobalState } from "../global-state";

export let context2d: CanvasRenderingContext2D;
let nextTextY = 15;

export type Render2dConfig = {
	drawDebugKeys: boolean;
	drawDebugPlayerList: boolean;
	drawSpectateText: boolean;
};

export function setContext2d(context: CanvasRenderingContext2D): void {
	context2d = context;
}

export function render2D(config: Render2dConfig): void {
	context2d.clearRect(0, 0, context2d.canvas.width, context2d.canvas.height);
	nextTextY = 15; // reset
	if (config.drawDebugKeys) {
		drawDebugKeys();
	}
	if (config.drawDebugPlayerList) {
		drawDebugPlayerList();
	}
	if (config.drawSpectateText) {
		drawSpectateText();
	}
}

function drawDebugKeys(): void {
	context2d.font = "14px sans-serif";
	context2d.fillStyle = "#fff";
	context2d.textAlign = "left";
	printText("Click on canvas to capture input");
	printText("TAB toggles between free-camera and player camera");
	printText("W,A,S,D to move around");
	printText("R to reset car");
	printText("Click to fire a projectile");
	printText("I to pause/unpause game");
	printText("Right-click to move up (in free-camera mode)");
	printText("CTRL to move down (in free-camera mode)");
}

function drawDebugPlayerList(): void {
	context2d.font = "15px sans-serif";
	context2d.fillStyle = "#fff";
	context2d.textAlign = "left";
	for (let player of GlobalState.playerList.getPlayers()) {
		printText(`${player.name} (${player.state})`);
	}
}

function printText(text: string): void {
	context2d.fillText(text, 10, nextTextY);
	nextTextY += 15;
}

function drawTextShadow(text: string, x: number, y: number, color = "#fff", shadowColor = "#000"): void {
	const oldFill = context2d.fillStyle;
	context2d.fillStyle = shadowColor;
	context2d.fillText(text, x + 1, y + 1);
	context2d.fillStyle = color;
	context2d.fillText(text, x, y);
	context2d.fillStyle = oldFill;
}

function drawSpectateText(): void {
	context2d.font = "32px sans-serif";
	context2d.textAlign = "center";
	drawTextShadow("Ești spectator, apasă SPACE ca să intri in joc", context2d.canvas.width * 0.5, 100);
}
