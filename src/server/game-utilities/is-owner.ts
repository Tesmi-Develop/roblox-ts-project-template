import { PlayerComponent } from "server/components/player-component";
import { IS_DEV, IS_STUDIO } from "shared/utilities/constants";

const owners: number[] = [];

export function isOwner(player: PlayerComponent | Player) {
	if (IS_STUDIO || IS_DEV) return true;

	return owners.includes(player.UserId);
}
