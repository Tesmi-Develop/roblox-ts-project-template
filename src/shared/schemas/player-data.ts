import { GetCurrentTime } from "shared/utilities/function-utilities";
import { PlayerData } from "types/player/player-data";

export const PlayerDataSchema: PlayerData = {
	Save: {
		LastUpdate: GetCurrentTime(),
		IsNewProfile: true,
		Money: 0,
	},
	Dynamic: {},
};
