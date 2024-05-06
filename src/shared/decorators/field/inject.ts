import { Dependency, Modding, Reflect } from "@flamework/core";
import { ModifyConstructorMethod } from "shared/utilities/function-utilities";

const INJECT_KEY = "Inject";

/**
 * @metadata flamework:type
 */
export const Inject = Modding.createDecorator("Property", (descriptor) => {
	const injectedType = Reflect.getMetadata<string>(descriptor.object, "flamework:type", descriptor.property);
	assert(injectedType, "Injected type not found");

	let injected = Reflect.getMetadata<Map<string, string>>(descriptor.object, INJECT_KEY);

	if (injected) {
		injected.set(descriptor.property, injectedType);
		return;
	}

	injected = new Map();
	injected.set(descriptor.property, injectedType);
	Reflect.defineMetadata(descriptor.object, INJECT_KEY, injected);

	ModifyConstructorMethod(
		descriptor.object,
		"constructor",
		(originalConstructor) =>
			function (this, ...args: unknown[]) {
				const injectProperies = Reflect.getMetadata<Map<string, string>>(descriptor.object, INJECT_KEY)!;

				injectProperies.forEach((typeId, property) => {
					this[property as never] = Dependency(typeId as never);
				});

				return originalConstructor(this, ...args);
			},
	);
});
