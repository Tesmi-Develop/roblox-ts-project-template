/* eslint-disable prettier/prettier */
import { UseSelectorHook, useSelector, useProducer } from "@rbxts/react-reflex";
import { RootProducer } from "../store";

export const useAppSelector: UseSelectorHook<RootProducer> = useSelector;
export const useAppProducer = useProducer<RootProducer>;
