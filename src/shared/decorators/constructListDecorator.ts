import { Reflect } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";

export function ConstructListDecorator<T extends object>() {
	const examplesMap = new Map<string, T>();
	const constructorMap = new Map<string, Constructor<T>>();
	const array: T[] = [];

	return $tuple(
		<K extends T>(Constructor: Constructor<K>) => {
			const foundConstructor = constructorMap.get(tostring(Constructor));

			if (foundConstructor) {
				throw `Attempting to register an item with an existing identifier: ${Constructor} Metadata: ${Reflect.getMetadata(
					foundConstructor,
					"identifier",
				)}`;
			}

			const instance = new Constructor();
			examplesMap.set(tostring(Constructor), instance);
			constructorMap.set(tostring(Constructor), Constructor);
			array.push(instance);
		},
		examplesMap,
		constructorMap,
		array,
	);
}
