import { CombineProducers, InferState } from "@rbxts/reflex";
import { playerProducer } from "./producer";

export const PlayerSlice = {
	PlayerData: playerProducer,
};

export type CombinePlayerSlices = CombineProducers<typeof PlayerSlice>;
export type PlayerState = InferState<CombinePlayerSlices>;
