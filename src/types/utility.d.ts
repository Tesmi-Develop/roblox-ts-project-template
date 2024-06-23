/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PATCH_ACTION_REMOVE } from "shared/utilities/constants";
import { Add, Eq } from "ts-arithmetic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OmitFirstParam<C> = C extends (toOmit: any, ...rest: infer Rest) => infer R
	? (...params: Rest) => R
	: never;

type OmitMultipleParams<F, C extends number, K extends number = 0> = Eq<C, K> extends 0
	? OmitMultipleParams<OmitFirstParam<F>, C, Add<K, 1>>
	: F;

type ReturnMethods<T extends object> = ExtractKeys<T, Callback>;

export type PatchDataType<D extends object> = Partial<{ [K in keyof D]: D[K] | typeof PATCH_ACTION_REMOVE }>;

export type ReactComponent<T extends object> = (props: T) => React.ReactElement;
export type AssetLink = string | number;

export type VoidCallback = () => void;

/**
 * Makes a type deeply immutable.
 */
export type DeepReadonly<T> = T extends Map<infer K, infer V>
	? ReadonlyMap<K, V>
	: T extends object
	? { readonly [K in keyof T]: DeepWritable<T[K]> }
	: T;

/**
 * Makes a type deeply mutable.
 */
export type DeepWritable<T> = T extends Map<infer K, infer V>
	? Map<K, V>
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
