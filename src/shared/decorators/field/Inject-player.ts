import { Reflect } from "@flamework/core";

export const INJECT_PLAYER_KEY = "Inject-player";

export const InjectPlayer = (target: object, propertyName: string) => {
	let array = Reflect.getMetadata(target, INJECT_PLAYER_KEY) as string[];

	if (!array) {
		array = [];
		Reflect.defineMetadata(target, INJECT_PLAYER_KEY, array);
	}

	array.push(propertyName);
};
