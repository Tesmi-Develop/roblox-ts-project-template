/* eslint-disable @typescript-eslint/no-explicit-any */
import { Reflect } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
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

type InferMap<T> = T extends Map<infer K, infer V> ? [K, V] : [string, T];

export function Mapper<T extends Map<any, any>, C extends defined>(
	object: T,
	mapper: (value: InferMap<T>[0], key: InferMap<T>[1]) => C,
) {
	const result: C[] = [];

	for (const [key, value] of pairs(object)) {
		result.push(mapper(value, key));
	}

	return result;
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

export function FillInRange<T>(array: T[], start: number, _end: number, value: T) {
	for (const i of $range(start, _end)) {
		array[i] = value;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ArrayChunks<T extends defined>(array: T[], chunkSize: number) {
	return array.reduce((resultArray, item, index) => {
		const chunkIndex = math.floor(index / chunkSize);

		if (!resultArray[chunkIndex]) {
			resultArray[chunkIndex] = [] as T[];
		}

		resultArray[chunkIndex].push(item);

		return resultArray;
	}, [] as T[][]);
}

export function getDeferredConstructor<T extends object>(ctor: Constructor<T>) {
	const obj = setmetatable({}, ctor as never) as InstanceType<T>;

	return [
		obj,
		(...args: ConstructorParameters<Constructor<T>>) => {
			const result = (obj as { "constructor"(...args: unknown[]): unknown }).constructor(...args);
			assert(result === undefined || result === obj, `Deferred constructors are not allowed to return values.`);
		},
	] as const;
}

export const ConvertSet = <T extends defined>(set: Set<T>) => {
	const array: T[] = [];
	set.forEach((value) => array.push(value));
	return array;
};

interface ConstructorWithIndex extends Constructor {
	__index: object;
}

export function GetInheritanceTree<T>(constructor: Constructor, parent: Constructor) {
	let currentClass = constructor as ConstructorWithIndex;
	let metatable = getmetatable(currentClass) as ConstructorWithIndex;
	const tree = [constructor] as Constructor<T>[];

	while (currentClass && rawget(metatable, "__index") !== parent) {
		currentClass = rawget(metatable, "__index") as ConstructorWithIndex;
		metatable = getmetatable(currentClass) as ConstructorWithIndex;
		tree.push(currentClass as unknown as Constructor<T>);
	}

	return tree;
}
