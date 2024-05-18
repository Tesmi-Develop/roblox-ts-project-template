import { BroadcastAction, CombineProducers, InferState } from "@rbxts/reflex";
import { playerProducer } from "./producer";
import { createBinarySerializer } from "@rbxts/flamework-binary-serializer";

export const PlayerSlice = {
	PlayerData: playerProducer,
};

export type CombinePlayerSlices = CombineProducers<typeof PlayerSlice>;
export type PlayerState = InferState<CombinePlayerSlices>;

export const DispatchSerializer = createBinarySerializer<BroadcastAction[]>();
