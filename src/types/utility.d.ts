import { Binding, useBinding } from "@rbxts/react";
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

export interface BindingAndSetter<T> {
	Binding: Binding<T>;
	Set: ReturnType<typeof useBinding<T>>[1];
}

export type ReactComponent<T extends object> = (props: T) => React.ReactElement;
export type AssetLink = string | number;
