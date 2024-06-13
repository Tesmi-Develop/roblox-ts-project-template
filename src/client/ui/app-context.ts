import { useAtom } from "@rbxts/charm";
import { createContext, useContext } from "@rbxts/react";
import { SyncerType } from "shared/network";
import { GameData } from "shared/schemas/game-data";
import { PlayerData } from "shared/schemas/player-data-types";

interface AppContext {
	ScreenGui: ScreenGui;
	Atoms: SyncerType;
}

export const AppContext = createContext<AppContext>(undefined!);

export const useAppContext = () => {
	return useContext(AppContext);
};

export const useScreenGui = () => {
	const { ScreenGui } = useAppContext();
	return ScreenGui;
};

export const usePlayerAtoms = () => {
	const { Atoms } = useAppContext();
	return Atoms;
};

export const usePlayerDataAtom = <T = PlayerData>(
	selector: (state: PlayerData) => T = ((state: T) => state) as never,
	dependencies?: unknown[],
) => {
	const { Atoms } = useAppContext();

	return useAtom(() => selector(Atoms.playerData()), dependencies);
};

export const useGameDataAtom = <T = GameData>(
	selector: (state: GameData) => T = ((state: T) => state) as never,
	dependencies?: unknown[],
) => {
	const { Atoms } = useAppContext();

	return useAtom(() => selector(Atoms.gameData()), dependencies);
};
