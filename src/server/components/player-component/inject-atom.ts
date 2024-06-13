import { Molecule } from "@rbxts/charm";
import { KeyofPlayerDataSlices, ConvertKeyofSlice } from "shared/schemas/player-data-types";

export const INJECT_ATOM_KEY = "INJECT_ATOM_KEY";

export interface PlayerModuleAtom<S> extends Molecule<S> {
	readonly __nominal: unique symbol;
	(state: S | ((prev: S) => S)): boolean;
}

let context: Set<KeyofPlayerDataSlices> | undefined = undefined;

export const GetInjectAtomContext = () => context;
export const ClearInjectAtomContext = () => (context = undefined);

export function InjectAtom<T extends KeyofPlayerDataSlices>(...args: T[]) {
	context = new Set(args);

	return INJECT_ATOM_KEY as unknown as PlayerModuleAtom<ConvertKeyofSlice<T>>;
}
