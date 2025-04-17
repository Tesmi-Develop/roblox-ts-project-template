import { setInterval } from "@rbxts/set-timeout";
import type { PlayerComponent } from "server/components/player-component";
import { PlayerInfo } from "types/player/player-info";

export function ToPlayerInfo(player: Player | PlayerComponent): PlayerInfo {
	return {
		Name: player.Name,
		DisplayName: player.DisplayName,
		UserId: player.UserId,
	};
}

export function WaitForStops(instance: BasePart, minSpeed: number) {
	return new Promise<void>((resolve) => {
		const disconnect = setInterval(() => {
			if (instance.AssemblyLinearVelocity.Magnitude >= minSpeed) return;
			disconnect();
			resolve();
		}, 1);
	});
}

export function SetCollisionGroup(instance: Instance, group: string): void {
	for (const child of instance.GetDescendants()) {
		if (!child.IsA("BasePart")) continue;
		child.CollisionGroup = group;
	}
}
