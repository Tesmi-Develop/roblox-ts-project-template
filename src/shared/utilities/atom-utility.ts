/* eslint-disable @typescript-eslint/no-explicit-any */
import { Atom, atom, useAtom } from "@rbxts/charm";
import { None, produce } from "@rbxts/immut";
import { Draft } from "@rbxts/immut/src/types-external";
import type { PlayerAtom } from "server/components/player-component";
import { PlayerData } from "shared/schemas/player-data-types";
import { OmitFirstParam } from "types/utility";

type InferAtomState<T> = T extends Atom<infer S> ? S : T extends PlayerAtom ? PlayerData : never;

export const MutateAtom = <C extends Atom<any> | PlayerAtom>(
	atom: C,
	recipe: (
		draft: Draft<InferAtomState<C>>,
	) => typeof draft | void | undefined | (InferAtomState<C> extends undefined ? typeof None : never),
) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return atom(produce(atom(), recipe)) as C extends Atom<any> ? void : boolean;
};

export interface ReactAtom<S> {
	useSelector(): S;
	useSelector<R>(selector: (state: S) => R): R;
	useAtom: () => Atom<S>;
}

export interface AtomMutation<S> {
	Mutate: (
		recipe: (draft: Draft<S>) => typeof draft | void | undefined | (S extends undefined ? typeof None : never),
	) => void;
}

export const CreateAtom = <
	S,
	A extends Record<string, (draft: Draft<S>, ...args: any[]) => S> = Record<
		string,
		(draft: Draft<S>, ...args: any[]) => S
	>,
>(
	state: S,
	actions: A = {} as A,
) => {
	const newAtom = atom(state);
	const dispatches = {};
	const atomApi = {} as ReactAtom<S> & AtomMutation<S>;

	// eslint-disable-next-line roblox-ts/no-array-pairs
	for (const [key, action] of pairs(actions)) {
		dispatches[key as never] = ((...args: unknown[]) => {
			const newState = produce(newAtom(), (draft) => (action as Callback)(draft, ...args)) as S;
			newAtom(newState);
			return newState;
		}) as never;
	}

	// React implementation
	atomApi.useSelector = function <R>(this, selector?: (state: S) => R) {
		const state = useAtom(newAtom);
		return selector?.(state) ?? state;
	};
	atomApi.useAtom = () => newAtom;

	setmetatable(atomApi, {
		__index: (_, index) => dispatches[index as never],
		__call: (_, ...args) => newAtom(...(args as [])),
	});

	return atomApi as { [K in keyof A]: OmitFirstParam<A[K]> } & ReactAtom<S> & Atom<S> & AtomMutation<S>;
};
