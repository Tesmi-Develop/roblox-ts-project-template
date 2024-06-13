import { Reflect } from "@flamework/core";

export const INJECT_TYPE_KEY = "Inject-type";

/** @metadata flamework:type */
export const InjectType = (target: object, propertyName: string) => {
	const moduleSpecifier = Reflect.getMetadata<string>(target, "flamework:type", propertyName);
	assert(moduleSpecifier, "Injected type not found");

	let map = Reflect.getMetadata<Map<string, string>>(target, INJECT_TYPE_KEY);

	if (!map) {
		map = new Map();
		Reflect.defineMetadata(target, INJECT_TYPE_KEY, map);
	}

	map.set(propertyName, moduleSpecifier);
};
