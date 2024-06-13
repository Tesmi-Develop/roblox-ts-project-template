import { Components } from "@flamework/components/out/components";
import { Dependency } from "@flamework/core/out/flamework";
import { CharacterRigR15, promiseR15 } from "@rbxts/character-promise";
import { Players } from "@rbxts/services";
import type { PlayerComponent } from "server/components/player-component";

export async function PromisePlayerDisconnected(player: Player) {
	assert(player.IsDescendantOf(Players), "Player must be a descendant of Players");

	await Promise.fromEvent(Players.PlayerRemoving, (playerWhoLeft) => playerWhoLeft === player);
}

/** @server */
export const GetPlayerComponent = (player: Player) => {
	const components = Dependency<Components>();
	return components.getComponent<PlayerComponent>(player)!;
};

/** @server */
export const WaitPlayerComponent = (player: Player) => {
	const components = Dependency<Components>();
	return components.waitForComponent<PlayerComponent>(player);
};

/** @server */
export const IsInitedPlayer = (player: Player) => {
	const components = Dependency<Components>();
	return components.getComponent<PlayerComponent>(player)?.IsStatus("Started");
};

/** @server */
export const ForeachInitedPlayers = (callback: (player: PlayerComponent) => void) => {
	Players.GetPlayers().forEach((player) => {
		const playerComponent = GetPlayerComponent(player);
		if (!playerComponent) return;
		if (!playerComponent.IsStatus("Started")) return;

		callback(playerComponent);
	});
};

export const PromiseCharacterAdded = async (player: Player) => {
	assert(player.IsDescendantOf(Players), "Player must be a descendant of Players");

	return new Promise<CharacterRigR15>((resolve) => {
		const character = player.Character ?? player.CharacterAdded.Wait()[0];
		promiseR15(character).then(resolve);
	});
};

export const CharacterAddedWithValidate = (player: Player, connection: (character: CharacterRigR15) => void) => {
	return player.CharacterAdded.Connect((character) => {
		promiseR15(character).then(connection);
	});
};

export const GetCharactersFromHits = (hitsList: BasePart[], onlyHumanoidRootPart = false) => {
	type Character = Model & { Humanoid: Humanoid };
	const characters = new Set<Character>();

	hitsList.forEach((hit) => {
		if (onlyHumanoidRootPart && hit.Name !== "HumanoidRootPart") return;

		const character = hit.FindFirstAncestorOfClass("Model");
		const humanoid = character?.FindFirstChildOfClass("Humanoid");

		if (!character) return;
		if (characters.has(character as Character)) return;
		if (!humanoid) return;
		if (humanoid.Health <= 0) return;

		characters.add(character as Character);
	});

	return characters;
};
