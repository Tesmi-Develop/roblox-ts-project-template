import { GetCurrentTime } from "shared/utilities/function-utilities";
import { DeepFreezeTable } from "shared/utilities/object-utilities";

const _playerDataSchema = {
	Save: {
		LastUpdate: GetCurrentTime(),
		IsNewProfile: true,
		Statistics: {
			Money: 0,
		},
		Inventories: {
			Inventory: [] as string[],
			Backpack: [] as string[],
		},
	},
	Dynamic: {
		a: 1,
	},
};

export const PlayerDataSchema = DeepFreezeTable(_playerDataSchema);
