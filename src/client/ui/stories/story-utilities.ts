import { Flamework } from "@flamework/core";

export namespace StoryUtilities {
	export const LoadGameData = () => {
		Flamework.addPaths("src/shared/game-data");
	};

	export const LoadClient = () => {
		Flamework.addPaths("src/client/components");
		Flamework.addPaths("src/client/controllers");
	};
}
