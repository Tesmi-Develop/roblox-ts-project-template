import { AbstractConstructor, Constructor } from "@flamework/core/out/utility";
import { BaseConfig } from "shared/decorators/constructor/config-decorator";

const TSConfig = <T>(
	constructor: AbstractConstructor<T>,
	onRegistered?: (constuctor: Constructor<T>, instance: T, configs: BaseConfig<T>) => void,
) => ({
	UniqueKey: "__TSConfig__" as const,
	Constructor: constructor,
	OnRegistered: onRegistered,
});

const TSConfigs = {};

export interface luaConfigs {}

export type LuaConfigs = { [K in keyof luaConfigs]: luaConfigs[K] & { Name: string } };

export const Configs = {
	...TSConfigs,
} as typeof TSConfigs & LuaConfigs;
