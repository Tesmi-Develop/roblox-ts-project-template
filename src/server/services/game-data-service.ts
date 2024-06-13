import { Service, OnStart } from "@flamework/core";
import { atom, sync } from "@rbxts/charm";
import { PlayerComponent } from "server/components/player-component";
import { Events } from "server/network";
import { DispatchSerializer } from "shared/network";
import { GameDataSchema } from "shared/schemas/game-data";
import { DeepCloneTable } from "shared/utilities/object-utilities";

@Service({})
export class GameDataService {
	private atom = atom(DeepCloneTable(GameDataSchema));

	public GetAtom() {
		return this.atom;
	}

	public ResetData() {
		this.atom(DeepCloneTable(GameDataSchema));
	}
}
