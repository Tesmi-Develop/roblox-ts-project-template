/* eslint-disable @typescript-eslint/no-explicit-any */
import { Flamework, Modding } from "@flamework/core";
import { ReplicatedStorage } from "@rbxts/services";
import { t } from "@rbxts/t";
import { $keys } from "rbxts-transformer-keys";
import { TypedConfigs } from "shared/decorators/constructor/config-decorator";
import { LuaConfigs } from "shared/game-data/configs";
import { DataStructure } from "shared/game-data/structure";
import { IS_CLIENT, IS_DEV } from "shared/utilities/constants";
import { GetLogger } from "shared/utilities/setup-logger";
import { DeepReadonly } from "types/utility";

const OBJECT_VALUE_NAME = "DataFolderReferense";
export type DataCollection = DeepReadonly<DataStructure>;

export class DataCollectionHandler {
	private DataFolderReferense!: ObjectValue;
	private compiledStructure = {} as DeepReadonly<DataStructure>;
	private logger = GetLogger();

	private initReferense() {
		const referense = ReplicatedStorage.FindFirstChild(OBJECT_VALUE_NAME);
		assert(referense && referense.IsA("ObjectValue"), "DataFolderReferense not found or not an ObjectValue");
		this.DataFolderReferense = referense;
		assert(referense.Value !== undefined, "DataFolderReferense is not set");
	}

	public GetStructure() {
		return this.compiledStructure;
	}

	private compileStructure() {
		const readInstance = (instance: Instance) => {
			const fullPath = instance.GetFullName();
			const splitted = fullPath.split(".");
			const startPosition = splitted.indexOf(this.DataFolderReferense.Value!.Name);

			let pointer: object = this.compiledStructure;
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

		IterateInstance(this.DataFolderReferense.Value!);
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
		IS_DEV && print("Current structure: ", this.compiledStructure);

		const guard = Flamework.createGuard<DataStructure>() as unknown as t.checkWithMessage;
		const [success, errorMessage] = guard(this.compiledStructure);

		!success && this.logger.Error(errorMessage);
	}

	public Start() {
		this.initReferense();
		this.compileStructure();
		this.validateStructure();
		this.initLuaConfigs();
	}
}

const collection = new DataCollectionHandler();
collection.Start();

Modding.registerDependency<DataCollection>(() => collection.GetStructure());
