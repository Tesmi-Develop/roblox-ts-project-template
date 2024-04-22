import type { PlayerComponent } from "server/components/player-component";

interface OnPlayerJoined {
	OnPlayerJoined(player: PlayerComponent): void;
}

interface OnPlayerLeaved {
	OnPlayerLeaved(player: PlayerComponent): void;
}
