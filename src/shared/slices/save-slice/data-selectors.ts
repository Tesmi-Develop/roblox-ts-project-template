import type { RootState } from "server/store";

export function SelectPlayerData(playerName: string) {
	return (State: RootState) => State.Data[playerName];
}

export function SelectPlayerSave(playerName: string) {
	return (state: RootState) => SelectPlayerData(playerName)(state)!.Save;
}
