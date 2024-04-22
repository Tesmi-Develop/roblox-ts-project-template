export const Spawn = (target: object, propertyName: string, descriptor: TypedPropertyDescriptor<Callback>) => {
	const callback = descriptor.value;

	descriptor.value = function (this, ...args: unknown[]) {
		return task.spawn(callback, this, ...args);
	};

	return descriptor;
};
