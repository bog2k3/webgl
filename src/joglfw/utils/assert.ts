export function assert(cond: boolean, message: string = "") {
	if (!cond)
		throw new Error("Assertion failed" + message ? ": " + message : "");
};