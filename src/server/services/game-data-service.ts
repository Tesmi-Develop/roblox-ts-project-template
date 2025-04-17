import { Modding, Service } from "@flamework/core";
import { GameDataSchema } from "shared/schemas/game-data";
import { GameAtom } from "shared/schemas/game-data-types";
import { CreateAtom } from "shared/utilities/atom-utility";
import { DeepCloneTable } from "shared/utilities/object-utilities";

const gameAtom = CreateAtom(DeepCloneTable(GameDataSchema));
Modding.registerDependency<GameAtom>(() => gameAtom);

@Service({
	loadOrder: -1,
})
export class GameDataService {
	private atom = gameAtom;

	public GetAtom() {
		return this.atom;
	}

	public Get() {
		return this.atom();
	}

	public Mutate(recipe: Parameters<typeof this.atom.Mutate>[0]) {
		this.atom.Mutate(recipe);
	}

	public Subscribe(listener: (state: typeof GameDataSchema) => void): () => void;
	public Subscribe<R>(selector: (state: typeof GameDataSchema) => R, listener: (state: R) => void): () => void;
	public Subscribe(...args: defined[]) {
		return this.atom.Subscribe(...(args as [() => unknown, () => void]));
	}

	public ResetData() {
		this.atom(DeepCloneTable(GameDataSchema));
	}
}
