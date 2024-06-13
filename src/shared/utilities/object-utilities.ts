import { Reflect } from "@flamework/core";
import { DeepReadonly } from "types/utility";

export function mapProperty<T extends object, K extends keyof T>(
	object: T,
	key: K,
	mapper: (value: NonNullable<T[K]>) => T[K] | undefined,
): T {
	if (object[key] !== undefined) {
		const copy = table.clone(object);
		copy[key] = mapper(object[key]!)!;
		return copy;
	}

	return object;
}

export function FilterMapToArray<K, V extends defined>(map: Map<K, V>, callback: (value: V, key: K) => boolean) {
	const array: V[] = [];
	map.forEach((value, key) => {
		callback(value, key) && array.push(value);
	});

	return array;
}

export function DeepCloneTable<V>(value: ReadonlyArray<V>): Array<V>;
export function DeepCloneTable<V>(value: ReadonlySet<V>): Set<V>;
export function DeepCloneTable<K, V>(value: ReadonlyMap<K, V>): Map<K, V>;
export function DeepCloneTable<T extends object>(value: T): T;
export function DeepCloneTable<T extends object>(obj: T): T {
	const result = {};

	for (const [key, value] of pairs(obj)) {
		result[key as never] = typeIs(value, "table") ? (DeepCloneTable(value as never) as never) : (value as never);
	}

	return result as T;
}

export function ReconcileTable<C extends object, T extends object>(originalObject: C, template: T): T & C {
	for (const [key, value] of pairs(template)) {
		if (originalObject[key as never] === undefined) {
			originalObject[key as never] = value as never;
		}
	}

	return originalObject as T & C;
}

export function DeepFreezeTable<T extends object>(obj: T) {
	for (const [key, value] of pairs(obj)) {
		if (typeIs(value, "table")) {
			DeepFreezeTable(value);
			continue;
		}
	}
	table.freeze(obj);

	return obj as DeepReadonly<T>;
}

export function GetIdentifier(obj: object, suffix = ""): string {
	return Reflect.getMetadata<string>(obj, "identifier") ?? `UnidentifiedFlameworkListener${suffix}`;
}
