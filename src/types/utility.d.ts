/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PATCH_ACTION_REMOVE } from "shared/utilities/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OmitFirstParam<C> = C extends (toOmit: any, ...rest: infer Rest) => infer R
	? (...params: Rest) => R
	: never;

type ReturnMethods<T extends object> = ExtractKeys<T, Callback>;

export type PatchDataType<D extends object> = Partial<{ [K in keyof D]: D[K] | typeof PATCH_ACTION_REMOVE }>;

export type ReactComponent<T extends object> = (props: T) => React.ReactElement;
export type AssetLink = string | number;

export type VoidCallback = () => void;

/**
 * Makes a type deeply immutable.
 */
export type DeepReadonly<T> =
	T extends Map<infer K, infer V>
		? ReadonlyMap<K, V>
		: T extends Set<infer R>
			? ReadonlySet<R>
			: T extends Instance
				? T
				: T extends Callback
					? T
					: T extends object
						? { readonly [K in keyof T]: DeepReadonly<T[K]> }
						: T;
/**
 * Makes a type deeply mutable.
 */
export type DeepWritable<T> =
	T extends ReadonlyMap<infer K, infer V>
		? Map<K, V>
		: T extends ReadonlySet<infer R>
			? Set<R>
			: T extends object
				? { -readonly [K in keyof T]: DeepWritable<T[K]> }
				: T;

/**
 * A selector function that can be used to select a subset of the state.
 * @param state The state.
 * @param params Optional parameters.
 * @return The selected part of the state.
 */
export type Selector<State = any, Result = unknown, Params extends never | any[] = any[]> = [Params] extends [never]
	? (state: State) => Result
	: (state: State, ...params: Params) => Result;

type PickIfExtends<T1, T2, U> = T1 extends T2 ? U : T1;

export type DeepReplace<T, U, C> = T extends U
	? C
	: T extends any[]
		? PickIfExtends<T[number], U, C>[]
		: T extends Map<any, any>
			? T
			: T extends Set<any>
				? T
				: T extends Instance
					? T
					: T extends object
						? { [K in keyof T]: DeepReplace<PickIfExtends<T[K], U, C>, U, C> }
						: T;
