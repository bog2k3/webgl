export interface IUpdatable {
	update(dt: number): void;
}

export function isUpdatable(x): x is IUpdatable {
	return "update" in x;
}