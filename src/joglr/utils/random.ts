const magic: number[] = [0x9E3779B9, 0x243F6A88, 0xB7E15162];

/** returns a random number between 0.0 and 1.0 */
export let rand = sfc32(magic[0], magic[1], magic[2], (new Date()).getTime());

export function randSeed(seed: number) {
	rand = sfc32(magic[0], magic[1], magic[2], seed);
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

function sfc32(a: number, b: number, c: number, d: number) {
	return function() {
		a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
		var t = (a + b) | 0;
		a = b ^ b >>> 9;
		b = c + (c << 3) | 0;
		c = (c << 21 | c >>> 11);
		d = d + 1 | 0;
		t = t + d | 0;
		c = c + t | 0;
		return (t >>> 0) / 4294967296;
	}
}