import { Flamework, OnInit, OnStart, Service } from "@flamework/core";
import type { Collection, CollectionOptions, CollectionSchema, LapisConfig } from "@rbxts/lapis";
import { DataStoreService, ReplicatedStorage, RunService } from "@rbxts/services";
import DataStoreServiceMock from "server/mock-datastore";
import { DataStoreBrokenDataScope, DataStoreName } from "shared/schemas/data-store-name";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { PlayerData } from "shared/schemas/player-data-types";
import { IS_STUDIO } from "shared/utilities/constants";

function FindLapisModule() {
	let result: ModuleScript | undefined;
	let found: Instance = ReplicatedStorage;

	while (!result) {
		found = found.FindFirstChild("lapis", true)!;
		if (!found) {
			throw "lapis module not found";
		}

		if (found.IsA("ModuleScript")) {
			result = found;
			break;
		}
	}

	return result;
}

@Service({})
export class DataStoreWrapperService implements OnStart, OnInit {
	private collection!: Collection<PlayerData["Save"]>;
	private storeForBrokenData?: DataStore;

	private IsEnableDataStoreAPI() {
		const [success] = pcall(() => DataStoreService.GetDataStore("__PS").GetAsync("-1"));
		return RunService.IsRunning() && success;
	}

	private initDataStoreForBrokenData() {
		const [success, result] = pcall(() => DataStoreService.GetDataStore(DataStoreName, DataStoreBrokenDataScope));
		if (success) {
			this.storeForBrokenData = result;
		}
	}

	public GetCollection() {
		return this.collection;
	}

	public onInit() {
		this.initDataStoreForBrokenData();

		let lapis: {
			createCollection: <T extends CollectionSchema, R extends boolean = true>(
				name: string,
				options: CollectionOptions<T, R>,
			) => Collection<T, R>;
			setConfig: (config: Partial<LapisConfig>) => void;
		};

		if (IS_STUDIO) {
			const module = FindLapisModule();
			const internalModule = module.FindFirstChild("Internal") as ModuleScript;

			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const internalApi = require(internalModule) as {
				new: (value: boolean) => typeof import("@rbxts/lapis");
			};
			const internal = internalApi.new(false);
			lapis = {
				setConfig: ((config: unknown) => {
					internal.setConfig(config as never);
				}) as never,
				createCollection: ((name: unknown, config: unknown) => {
					return internal.createCollection(name as never, config as never);
				}) as never,
			};
		} else {
			lapis = import("@rbxts/lapis").expect();
		}

		lapis.setConfig({
			dataStoreService: this.IsEnableDataStoreAPI() ? DataStoreService : new DataStoreServiceMock(),
		});

		this.collection = lapis.createCollection(DataStoreName, {
			defaultData: PlayerDataSchema["Save"],
			validate: Flamework.createGuard(),
		});
	}

	public async SaveBrokenData(key: number, data: {}) {
		assert(this.storeForBrokenData, "Failed to save broken data, no data store found");
		data["Date" as never] = DateTime.now().FormatUniversalTime("LLL", "en-us") as never;
		this.storeForBrokenData.SetAsync(tostring(key), data);
	}

	public async LoadProfile(player: Player | number) {
		const userId = typeIs(player, "number") ? player : player.UserId;
		const document = await this.collection.load(tostring(userId), [userId]);

		if (typeIs(player, "Instance") && player.Parent === undefined) {
			document.close().catch(warn);
			error(`Failed to load profile for ${player.Name}`);
		}

		return document;
	}

	onStart() {}
}
