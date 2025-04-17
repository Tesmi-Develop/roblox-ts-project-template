import { useEventListener, useMountEffect } from "@rbxts/pretty-react-hooks";
import { useEffect, useState } from "@rbxts/react";
import { Players } from "@rbxts/services";
import { LocalPlayer } from "shared/utilities/constants";

export function usePlayers() {
	const [players, setPlayers] = useState(Players.GetPlayers());

	useMountEffect(() => {
		setPlayers(players.filter((v) => v !== LocalPlayer));
	});

	useEventListener(Players.PlayerAdded, (p) => setPlayers([...players, p]));
	useEventListener(Players.PlayerRemoving, (p) => setPlayers(players.filter((v) => v !== p)));

	return players;
}
