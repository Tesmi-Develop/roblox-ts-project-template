import { Service } from "@flamework/core";
import { atom } from "@rbxts/charm";
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
