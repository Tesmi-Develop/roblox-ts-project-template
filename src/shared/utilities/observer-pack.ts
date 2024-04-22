export type ObserverCallback<T, C extends object> = (value: T, config: C) => T;

export class ObserverPack<O extends object, T = number> {
	private callbacks = [] as ObserverCallback<T, O>[];

	constructor(callbacks: ObserverCallback<T, O>[]) {
		this.callbacks = callbacks;
	}

	public AddCallback(callback: ObserverCallback<T, O>) {
		this.callbacks.push(callback);
	}

	public RemoveCallback(callback: ObserverCallback<T, O>) {
		const index = this.callbacks.findIndex((value) => value === callback);
		if (index === -1) return;

		this.callbacks.remove(index);
	}

	public CalculateValue(value: T, config: O) {
		this.callbacks.forEach((callback) => (value = callback(value, config)));

		return value;
	}
}
