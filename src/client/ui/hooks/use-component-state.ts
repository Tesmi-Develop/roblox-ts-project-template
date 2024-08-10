/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "@rbxts/react";

export interface LikeSharedComponent<S> {
	GetState(): S;
	Subscribe(listener: (state: S, previousState: S) => void): () => void;
	Subscribe<T>(selector: (state: S) => T, listener: (state: T, previousState: T) => void): () => void;
}

export function useComponentState<S, R = S>(
	component: LikeSharedComponent<S>,
	selector: (state: S) => R = (state) => state as unknown as R,
) {
	const [state, setState] = useState(selector(component.GetState()));

	useEffect(() => {
		return component.Subscribe(selector, (state) => setState(state));
	}, [component, selector]);

	useEffect(() => {
		setState(selector(component.GetState()));
	}, [component, selector]);

	return state;
}
