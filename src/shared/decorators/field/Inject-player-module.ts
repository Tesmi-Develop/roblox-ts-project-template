import { Reflect } from "@flamework/core";

export const INJECT_PLAYER_MODULE_KEY = "Inject-player-module";

/** @metadata flamework:type @metadata macro */
export const InjectPlayerModule = (target: object, propertyName: string) => {
	const moduleSpecifier = Reflect.getMetadata<string>(target, "flamework:type", propertyName);
	assert(moduleSpecifier, "Injected type not found");

	let map = Reflect.getMetadata<Map<string, string>>(target, INJECT_PLAYER_MODULE_KEY);

	if (!map) {
		map = new Map();
		Reflect.defineMetadata(target, INJECT_PLAYER_MODULE_KEY, map);
	}

	map.set(propertyName, moduleSpecifier);
};
