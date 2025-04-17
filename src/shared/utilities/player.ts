import { Components } from "@flamework/components/out/components";
import { Dependency } from "@flamework/core/out/flamework";
import { CharacterRigR15, promiseR15 } from "@rbxts/character-promise";
import { Players } from "@rbxts/services";
import type { PlayerComponent } from "server/components/player-component";
import type { PlayerService } from "server/services/player-service";
import { IS_SERVER, IS_STUDIO } from "./constants";

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
export const GetPlayerFromPart = (part: BasePart) => {
	const model = part.FindFirstAncestorOfClass("Model");
	if (!model) return;

	const player = Players.GetPlayerFromCharacter(model);
	if (!player) return;

	return GetPlayerComponent(player);
};

/** @server */
export const WaitPlayerComponent = (player: Player) => {
	const components = Dependency<Components>();
	return components.waitForComponent<PlayerComponent>(player);
};

/** @server */
export const WaitReadyPlayerComponent = async (player: Player) => {
	const component = await WaitPlayerComponent(player);
	await component.WaitForStatus("Started");

	return component;
};

/** @server */
export const IsInitedPlayer = (player: Player) => {
	const components = Dependency<Components>();
	return components.getComponent<PlayerComponent>(player)?.IsStatus("Started");
};

/** @server */
export const ForeachStartedPlayers = (callback: (player: PlayerComponent) => void) => {
	assert(IS_SERVER || IS_STUDIO, "ForeachStartedPlayers must be called on the server");
	Dependency<PlayerService>()
		.GetPlayers()
		.forEach((player) => {
			if (!player.IsStatus("Started")) return;
			callback(player);
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

		if (!character || characters.has(character as Character)) return;
		if (!humanoid || humanoid.Health <= 0) return;

		characters.add(character as Character);
	});

	return characters;
};

export const GetPlayersFromHits = (hitsList: BasePart[], onlyHumanoidRootPart = false) => {
	const players = new Set<Player>();

	hitsList.forEach((hit) => {
		if (onlyHumanoidRootPart && hit.Name !== "HumanoidRootPart") return;

		const character = hit.FindFirstAncestorOfClass("Model");
		const humanoid = character?.FindFirstChildOfClass("Humanoid");
		const player = Players.GetPlayerFromCharacter(character);

		if (!character || !player || players.has(player)) return;
		if (!humanoid || humanoid.Health <= 0) return;

		players.add(player);
	});

	return players;
};
