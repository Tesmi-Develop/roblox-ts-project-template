import { Flamework, OnInit, OnStart, Service } from "@flamework/core";
import { Collection, createCollection, setConfig } from "@rbxts/lapis";
import { DataStoreService, RunService } from "@rbxts/services";
import DataStoreServiceMock from "server/mock-datastore";
import { DataStoreBrokenDataScope, DataStoreName } from "shared/schemas/data-store-name";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { PlayerData } from "shared/schemas/player-data-types";

@Service({})
export class DataStoreWrapperService implements OnStart, OnInit {
	private collection!: Collection<PlayerData["Save"]>;
	private storeForBrokenData?: DataStore;

	public GetCollection() {
		return this.collection;
	}

	private IsEnableDataStoreAPI() {
		const [success] = pcall(() => DataStoreService.GetDataStore(DataStoreName));
		return RunService.IsRunning() && success;
	}

	private initDataStoreForBrokenData() {
		const [success, result] = pcall(() => DataStoreService.GetDataStore(DataStoreName, DataStoreBrokenDataScope));
		if (success) {
			this.storeForBrokenData = result;
		}
	}

	onInit() {
		this.initDataStoreForBrokenData();
		setConfig({
			dataStoreService: this.IsEnableDataStoreAPI() ? DataStoreService : new DataStoreServiceMock(),
		});

		this.collection = createCollection(DataStoreName, {
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
