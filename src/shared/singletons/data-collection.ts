/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Flamework, Modding } from "@flamework/core";
import { ReplicatedStorage } from "@rbxts/services";
import { t } from "@rbxts/t";
import { $keys } from "rbxts-transformer-keys";
import { TypedConfigs } from "shared/decorators/constructor/config-decorator";
import type { Configs, LuaConfigs } from "shared/game-data/configs";
import { Config } from "shared/game-data/constructors/Config";
import { DataStructure } from "shared/game-data/structure";
import { IS_CLIENT, IS_DEV, IS_STUDIO } from "shared/utilities/constants";
import { GetLogger } from "shared/utilities/setup-logger";
import { DeepReadonly } from "types/utility";

const compiledStructure = {} as DeepReadonly<DataStructure>;
export type DataCollection = DataStructure;

export class DataCollectionHandler {
	private logger = GetLogger();
	public static Instance: DataCollectionHandler | undefined;

	public static Init(referense: Instance | DataStructure) {
		this.Instance?.Destroy();
		this.Instance = new DataCollectionHandler();
		this.Instance.Start(referense);

		return () => {
			this.Instance?.Destroy();
			this.Instance = undefined;
		};
	}

	public GetStructure() {
		return compiledStructure;
	}

	private compileStructure(referense: Instance | DataStructure) {
		if (!typeIs(referense, "Instance")) {
			for (const [key, value] of pairs(referense)) {
				compiledStructure[key as never] = value as never;
			}
			return;
		}

		const readInstance = (instance: Instance) => {
			const fullPath = instance.GetFullName();
			const splitted = fullPath.split(".");
			const startPosition = splitted.indexOf(referense.Name);

			let pointer: object = compiledStructure;
			let object: unknown = {};
			object = instance.IsA("ModuleScript") ? require(instance) : object;

			for (const i of $range(startPosition + 1, splitted.size() - 1)) {
				const key = splitted[i];
				const oldPointer = pointer;
				pointer = pointer[key as never] ?? {};

				if (i === splitted.size() - 1) {
					oldPointer[key as never] = object as never;
					continue;
				}

				oldPointer[key as never] = pointer as never;
			}
		};

		const IterateInstance = (instance: Instance) => {
			instance.GetChildren().forEach((child) => {
				readInstance(child);
				if (child.IsA("ModuleScript")) return;
				IterateInstance(child);
			});
		};

		IterateInstance(referense);
	}

	private initLuaConfigs() {
		$keys<LuaConfigs>().forEach((key) => {
			const data = this.GetStructure().Configs[key] as never as { Name: string }[];
			this.logger.Debug(`Loaded ${key} config with ${data.size()} elements`);
			data.forEach((element) => {
				TypedConfigs[key].Instances.push(element);
				TypedConfigs[key].MappedInstances.set(element.Name, element);
			});
		});
	}

	private validateStructure() {
		if (IS_CLIENT) return;
		IS_DEV && print("Current structure: ", compiledStructure);

		const guard = Flamework.createGuard<DataStructure>() as unknown as t.checkWithMessage;
		const [success, errorMessage] = guard(compiledStructure);

		!success && this.logger.Error(errorMessage);
	}

	public Destroy() {
		for (const [key, value] of pairs(TypedConfigs)) {
			value.Constructors = [];
			value.Instances = [];
			value.MappedConstructors = new Map();
			value.MappedInstances = new Map();
		}
	}

	public RegisterConfig<C extends keyof Omit<typeof Configs, keyof Omit<typeof Configs, keyof LuaConfigs>>>(
		config: LuaConfigs[C],
		category: C,
	) {
		TypedConfigs[category].Instances.push(config);
		TypedConfigs[category].MappedInstances.set((config as Record<string, string>).Name, config);

		return () => {
			const configs = TypedConfigs[category];
			configs.Instances.remove(
				configs.Instances.findIndex(
					(instance) => (instance as Config).Name === (config as Record<string, string>).Name,
				),
			);
			configs.MappedInstances.delete((config as Record<string, string>).Name);
		};
	}

	public Start(referense: Instance | DataStructure) {
		this.compileStructure(referense);
		this.validateStructure();
		this.initLuaConfigs();
	}
}

Modding.registerDependency<DataCollectionHandler>(() => DataCollectionHandler.Instance);
Modding.registerDependency<DataCollection>(() => compiledStructure);

export function LoadGameDataFromReplicatedStorage() {
	const referense = ReplicatedStorage.FindFirstChild("GameData");

	if (!referense) {
		warn("Not found GameData instance in ReplicatedStorage. Loading default structure");
		return DataCollectionHandler.Init(import("shared/game-data/mock-data-structure").expect().DataStructureMock);
	}

	return DataCollectionHandler.Init(referense);
}

if (IS_STUDIO) {
	DataCollectionHandler.Init(import("shared/game-data/mock-data-structure").expect().DataStructureMock);
}
