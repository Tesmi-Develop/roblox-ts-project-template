import { Flamework } from "@flamework/core";
import { RootProducer } from "client/store";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { LocalPlayer } from "shared/utilities/constants";

export namespace StoryUtilities {
	export const LoadGameData = () => {
		Flamework.addPaths("src/shared/game-data");
	};

	export const LoadClient = () => {
		Flamework.addPaths("src/client/components");
		Flamework.addPaths("src/client/controllers");
	};

	export const LoadPlayerData = () => {
		RootProducer.SetPlayerData(LocalPlayer.Name, table.clone(PlayerDataSchema));
	};
}
