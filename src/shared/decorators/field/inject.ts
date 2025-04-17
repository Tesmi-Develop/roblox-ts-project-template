import { Dependency, Modding, Reflect } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
import { ModifyConstructorMethod } from "shared/utilities/function-utilities";

const INJECT_KEY = "Inject";

/** @metadata flamework:type @deprecated */
export const Inject = (ctor: object, property: string) => {
	const injectedType = Reflect.getMetadata<string>(ctor, "flamework:type", property);
	assert(injectedType, "Injected type not found");

	let injected = Reflect.getMetadata<Map<string, string>>(ctor, INJECT_KEY);

	if (injected) {
		injected.set(property, injectedType);
		return;
	}

	injected = new Map();
	injected.set(property, injectedType);
	Reflect.defineMetadata(ctor, INJECT_KEY, injected);

	ModifyConstructorMethod(
		ctor as Constructor,
		"constructor",
		(originalConstructor) =>
			function (this, ...args: unknown[]) {
				const injectProperies = Reflect.getMetadata<Map<string, string>>(ctor, INJECT_KEY)!;

				injectProperies.forEach((typeId, property) => {
					this[property as never] = Dependency(typeId as never);
				});

				return originalConstructor(this, ...args);
			},
	);
};
