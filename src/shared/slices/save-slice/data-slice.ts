import { createProducer } from "@rbxts/reflex";
import { PatchData } from "shared/utilities/function-utilities";
import { mapProperty } from "shared/utilities/object-utilities";
import { PlayerData } from "types/player/player-data";

interface SaveState {
	readonly [PlayerName: string]: Readonly<PlayerData> | undefined;
}

const initialState: SaveState = {};
export const dataSlice = createProducer(initialState, {
	SetPlayerData: (state, playerName: string, playerData: PlayerData) => ({
		...state,
		[playerName]: playerData,
	}),

	DeletePlayerData: (state, playerName: string) => ({
		...state,
		[playerName]: undefined,
	}),

	PatchPlayerSave: (state, playerName: string, patch: Partial<PlayerData["Save"]>) => {
		return mapProperty(state, playerName, (playerData) => ({
			...playerData,
			Save: PatchData(playerData.Save, patch),
		}));
	},
});
