import { CommandGuard } from "@rbxts/commander";
import { IsHaveRank } from "shared/enums/roles";
import { IS_DEV } from "shared/utilities/constants";
import { GetPlayerComponent } from "shared/utilities/player";

export const isDeveloper: CommandGuard = (interaction) => {
	if (IS_DEV) return true;

	const playerComponent = GetPlayerComponent(interaction.executor!);
	const haveRank = IsHaveRank(playerComponent.GetData().Save.Role, "Developer");

	!haveRank && interaction.error("Only developers can use this command.");

	return haveRank;
};
