/* eslint-disable prettier/prettier */
import { UseSelectorHook, useSelector, useProducer } from "@rbxts/react-reflex";
import { RootProducer, RootState } from "../store";
import { useBinding, useEffect } from "@rbxts/react";

export const useAppSelector: UseSelectorHook<RootProducer> = useSelector;
export const useAppProducer = useProducer<RootProducer>;

export const useAppSelectorBinding = <R>(selector: (state: RootState) => R) => {
	const rootProducer = useAppProducer();
	const [stateBinding, setStateBinding] = useBinding(rootProducer.getState(selector));

	useEffect(() => {
		return rootProducer.subscribe(selector, setStateBinding);
	}, [selector]);

	return stateBinding;
}
