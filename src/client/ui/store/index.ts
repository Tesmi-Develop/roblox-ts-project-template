import { InferState, InferActions, combineProducers } from "@rbxts/reflex";
import { Slices } from "./slices";

export type RootState = InferState<typeof RootProducer>;
export type RootActions = InferActions<typeof RootProducer>;
export type RootProducer = typeof RootProducer;
export const RootProducer = combineProducers({
	...Slices,
});

export default RootProducer;
