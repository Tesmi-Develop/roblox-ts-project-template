/* eslint-disable @typescript-eslint/no-explicit-any */
import { Atom, Molecule, atom, observe, subscribe } from "@rbxts/charm";
import { None, produce } from "@rbxts/immut";
import { Draft } from "@rbxts/immut/src/types-external";
import type { PlayerAtom } from "server/components/player-component";
import { PlayerData } from "shared/schemas/player-data-types";
import { OmitFirstParam, VoidCallback } from "types/utility";

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

export interface AtomApi<S> {
	Mutate: (
		recipe: (
			draft: Draft<S>,
			original: S,
		) => typeof draft | void | undefined | (S extends undefined ? typeof None : never),
	) => void;
	Subscribe(listener: (state: S, prev: S) => void): () => void;
	Subscribe<R>(selector: (state: S) => R, listener: (state: R, prevState: R) => void): () => void;
	Observe<Item>(
		callback: (state: S) => readonly Item[],
		factory: (item: Item, index: number) => VoidCallback | void,
	): VoidCallback;

	Destroy: () => void;
}

export type WrappedAtom<S, A = {}> = ReadonlyWrappedAtom<S> &
	AtomApi<S> &
	ReactAtom<S> & { [K in keyof A]: OmitFirstParam<A[K]> } & Atom<S>;
export type ReadonlyWrappedAtom<S> = Omit<AtomApi<S>, "Mutate"> & ReactAtom<S> & Molecule<S>;

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
	const atomApi = {} as ReactAtom<S> & AtomApi<S>;
	const disconnects = new Set<VoidCallback>();

	// eslint-disable-next-line roblox-ts/no-array-pairs
	for (const [key, action] of pairs(actions)) {
		dispatches[key as never] = ((...args: unknown[]) => {
			const newState = produce(newAtom(), (draft) => (action as Callback)(draft, ...args)) as S;
			newAtom(newState);
			return newState;
		}) as never;
	}

	// API implementation
	atomApi.Subscribe = function (this, ...args: unknown[]) {
		if (args.size() === 1) {
			return subscribe(newAtom, args[0] as (state: S) => void);
		}

		const cleanup = subscribe(
			() => (args[0] as (state: S) => any)(newAtom()),
			(state: S, prev) => task.spawn(args[1] as never, state, prev),
		);

		disconnects.add(cleanup);
		return () => {
			cleanup();
			disconnects.delete(cleanup);
		};
	};

	atomApi.Observe = function (this, selector, factory) {
		const cleanup = observe(() => selector(newAtom()), factory);

		disconnects.add(cleanup);
		return () => {
			cleanup();
			disconnects.delete(cleanup);
		};
	};

	atomApi.Destroy = () => disconnects.forEach((fn) => fn());

	atomApi.Mutate = (recipe) => {
		const data = produce(newAtom(), (draft) => recipe(draft, newAtom()));
		//RepairDataFromDraft(data);
		newAtom(data);
	};

	setmetatable(atomApi, {
		__index: (_, index) => dispatches[index as never],
		__call: (_, ...args) => newAtom(...(args as [])),
	});

	return atomApi as WrappedAtom<S, A>;
};
