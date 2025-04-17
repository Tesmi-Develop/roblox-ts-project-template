import { Flamework } from "@flamework/core";
import { GetCurrentTime } from "shared/utilities/function-utilities";
import { DeepFreezeTable } from "shared/utilities/object-utilities";
import { playerData } from "./player-data-types";

const _playerDataSchema: playerData = {
	Save: {
		LastUpdate: GetCurrentTime(),
		IsNewProfile: true,
	},
	Dynamic: {},
};

export const PlayerDataValidator = Flamework.createGuard<playerData>();
export const PlayerDataSchema = DeepFreezeTable(_playerDataSchema);
