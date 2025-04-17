import { CreateIdGenerator } from "./function-utilities";

export class Event<T extends unknown[]> {
	private listeners: Map<string, (...args: T) => void> = new Map();
	private nextId = CreateIdGenerator(true);

	public Fire(...args: T) {
		this.listeners.forEach((listener) => {
			try {
				listener(...args);
			} catch (e) {
				warn(e);
			}
		});
	}

	public Connect(callback: (...args: T) => void) {
		const id = this.nextId();
		this.listeners.set(id, callback);

		return () => {
			this.listeners.delete(id);
		};
	}

	public Destroy() {
		this.listeners.clear();
		setmetatable(this, undefined);
	}
}
