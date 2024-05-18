import { Service, OnStart, OnInit, Flamework } from "@flamework/core";
import { Collection, createCollection, setConfig } from "@rbxts/lapis";
import { DataStoreService } from "@rbxts/services";
import DataStoreServiceMock from "server/mock-datastore";
import { DataStoreName } from "shared/schemas/data-store-name";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { PlayerData } from "types/player/player-data";

@Service({})
export class DataStoreWrapperService implements OnStart, OnInit {
	private collection!: Collection<PlayerData["Save"]>;

	private IsEnableDataStoreAPI() {
		const [success, output] = pcall(() => DataStoreService.GetDataStore(DataStoreName));
		return success;
	}

	onInit() {
		setConfig({
			dataStoreService: this.IsEnableDataStoreAPI() ? DataStoreService : new DataStoreServiceMock(),
		});

		this.collection = createCollection(DataStoreName, {
			defaultData: PlayerDataSchema["Save"],
			validate: Flamework.createGuard(),
		});
	}

	public async LoadProfile(player: Player) {
		const document = await this.collection.load(tostring(player.UserId), [player.UserId]);

		if (player.Parent === undefined) {
			document.close().catch(warn);
			error(`Failed to load profile for ${player.Name}`);
		}

		return document;
	}

	onStart() {}
}
