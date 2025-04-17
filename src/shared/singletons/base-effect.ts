import { Dependency } from "@flamework/core";
import type { PlayerComponent } from "server/components/player-component";
import type { PlayerService } from "server/services/player-service";
import { GetClassName } from "shared/utilities/function-utilities";

export abstract class BaseVisualEffect<A extends unknown[]> {
	abstract onCast(...args: A): void;
	abstract onStop(...args: unknown[]): void;
	private playersService = Dependency<PlayerService>() as PlayerService;

	Cast(players: PlayerComponent[] | "all", ...args: A): void {
		if (players === "all") {
			this.playersService.GetPlayers().forEach((player) => {
				this.playersService.Events.onCastVFX(player.instance, GetClassName(this), ...args);
			});
			return;
		}

		for (const player of players) {
			this.playersService.Events.onCastVFX(player.instance, GetClassName(this), ...args);
		}
	}

	Stop(players: PlayerComponent[] | "all", ...args: unknown[]) {
		if (players === "all") {
			this.playersService.GetPlayers().forEach((player) => {
				this.playersService.Events.onStopVFX(player.instance, GetClassName(this), ...args);
			});
			return;
		}

		for (const player of players) {
			this.playersService.Events.onStopVFX(player.instance, GetClassName(this), ...args);
		}
	}

	CastInRadius(center: Vector3, radius: number, ...args: A) {
		this.playersService.GetPlayers().forEach((player) => {
			const character = player.instance.Character;
			if (!character) return;
			const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
			if (!root) return;

			const distance = root.Position.sub(center).Magnitude;
			distance <= radius && this.playersService.Events.onCastVFX(player.instance, GetClassName(this), ...args);
		});
	}
}
