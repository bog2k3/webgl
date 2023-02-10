const magic: number[] = [0x9E3779B9, 0x243F6A88, 0xB7E15162];

export let rand = sfc32(magic[0], magic[1], magic[2], (new Date()).getTime());

export function randSeed(seed: number) {
	rand = sfc32(magic[0], magic[1], magic[2], seed);
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