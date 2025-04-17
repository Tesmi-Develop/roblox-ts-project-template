/* eslint-disable @typescript-eslint/no-explicit-any */
import { Constructor } from "@flamework/core/out/utility";
import Object from "@rbxts/object-utils";
import { $keys } from "rbxts-transformer-keys";
import { Configs, LuaConfigs } from "shared/game-data/configs";

export interface BaseConfig<T = object> {
	Constructors: Constructor<T>[];
	Instances: T[];
	MappedConstructors: Map<string, Constructor<T>>;
	MappedInstances: Map<string, T>;
}

export interface ConfigData {
	BaseClass: string;
}

type AbstractConstructorType<T> = T extends abstract new (...args: never[]) => infer R ? R : never;

export const TypedConfigs = Configs as unknown as Record<string, ConfigData & BaseConfig>;

Object.keys(Configs as never as typeof TypedConfigs).forEach((key) => {
	TypedConfigs[key].Constructors = [];
	TypedConfigs[key].Instances = [];
	TypedConfigs[key].MappedConstructors = new Map();
	TypedConfigs[key].MappedInstances = new Map();
});

$keys<LuaConfigs>().forEach((key) => {
	TypedConfigs[key] = {} as never;
	TypedConfigs[key].Instances = [];
	TypedConfigs[key].MappedInstances = new Map();
});

const GetBaseConstructorFromConfig = (data: { UniqueKey: "__TSConfig__"; Constructor: Constructor }) => {
	if ("UniqueKey" in data && data.UniqueKey === "__TSConfig__") {
		return data.Constructor;
	}

	return data;
};

const registerConfig = (ctor: Constructor) => {
	const config = new ctor();
	const key = Object.keys(Configs as never as typeof TypedConfigs).find(
		(value) => config instanceof (GetBaseConstructorFromConfig(Configs[value as never] as never) as Constructor),
	);

	assert(key, `Invalid config for ${ctor}`);
	assert(!TypedConfigs[key].MappedConstructors.has(`${ctor}`), `Duplicate config for ${ctor}`);

	TypedConfigs[key].Constructors.push(ctor);
	TypedConfigs[key].Instances.push(config);
	TypedConfigs[key].MappedConstructors.set(`${ctor}`, ctor);
	TypedConfigs[key].MappedInstances.set(`${ctor}`, config);

	const configData = Configs[key as never] as { UniqueKey: "__TSConfig__"; OnRegistered: Callback };
	if ("UniqueKey" in configData && configData.UniqueKey === "__TSConfig__") {
		configData.OnRegistered?.(ctor as never, config as never, TypedConfigs[key] as never);
	}
};

/** @metadata reflect identifier */
export const ConfigDecorator = (ctor: Constructor) => registerConfig(ctor);

export const GetConfigData = <
	T extends keyof typeof Configs,
	K extends T extends keyof LuaConfigs
		? keyof Omit<BaseConfig, "MappedConstructors" | "Constructors">
		: keyof BaseConfig,
>(
	configType: T,
	key: K,
) =>
	TypedConfigs[configType][key] as unknown as BaseConfig<
		(typeof Configs)[T] extends { Interface: infer R }
			? R
			: (typeof Configs)[T] extends { Constructor: infer C }
				? AbstractConstructorType<C>
				: T extends keyof LuaConfigs
					? (typeof Configs)[T]
					: AbstractConstructorType<(typeof Configs)[T]>
	>[K];
