export function assert(cond: boolean, errorMessage: string = "") {
	if (!cond) {
		debugger;
		throw new Error("Assertion failed" + errorMessage ? ": " + errorMessage : "");
	}
}
