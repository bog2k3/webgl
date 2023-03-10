export function logprefix(prefix: string) {
	return {
		log(...args): void {
			const message: string = args.shift();
			console.log(`[${prefix}] ${message}`, ...args);
		},
		warn(...args): void {
			const message: string = args.shift();
			console.warn(`[${prefix}] ${message}`, ...args);
		},
		error(...args): void {
			const message: string = args.shift();
			console.error(`[${prefix}] ${message}`, ...args);
		},
		debug(...args): void {
			const message: string = args.shift();
			console.debug(`[${prefix}] ${message}`, ...args);
		},
	};
}
