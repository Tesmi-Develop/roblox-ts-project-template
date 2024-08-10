import { gameDataSlice } from "./game-data";
import { PageSlice } from "./page-slice";
import { playerDataSlice } from "./player-data";

export const Slices = {
	playerData: playerDataSlice,
	gameData: gameDataSlice,
	page: PageSlice,
};
