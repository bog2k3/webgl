/** returns a random number between 0.0 and 1.0 */
export let rand = mulberry32(new Date().getMilliseconds());

/** Seed the generator with a number. The number should be an integer between 0 and 2^32 for best results */
export function randSeed(seed?: number) {
	if (!seed) {
		seed = new Date().getMilliseconds();
	}
	rand = mulberry32(seed);
}

/** returns a **signed** random number between -1.0 and +1.0 */
export function srand() {
	return 2 * rand() - 1;
}

/**
 * Generates an **integer** random number between 0 and max inclusive, with equal chances for all numbers, including max
 * negative value for max is allowed, in this case the value will be between [max..0]
 */
export function randi(max: number) {
	let sign = 1;
	if (max < 0) {
		max = -max;
		sign = -1;
	}
	return sign * Math.floor(rand() * (max + 0.9999));
}

/**
 * Returns a number random between min (inclusive) and max (inclusive), with equal chances for all numbers.
 * Negative values are allowed, but min must always be smaller than max
 */
export function randi2(min: number, max: number) {
	if (min > max) {
		return 0;
	}
	return min + randi(max - min);
}

export function randomShuffle<T>(list: T[]): void {
	const shuffledList: T[] = list
		.map((x) => ({
			x,
			order: rand(),
		}))
		.sort((a, b) => a.order - b.order)
		.map((e) => e.x);
	Object.assign(list, shuffledList);
}

function mulberry32(a: number): () => number {
	return function () {
		var t = (a += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
