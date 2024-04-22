import { UseSelectorHook, useSelector, useProducer } from "@rbxts/react-reflex";
import type RootProducer from "client/store";

export const useAppSelector: UseSelectorHook<RootProducer> = useSelector;
export const useAppProducer = useProducer<RootProducer>;

