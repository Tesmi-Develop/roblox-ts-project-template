import { BroadcastAction, InferActions, InferState, combineProducers, createBroadcaster } from "@rbxts/reflex";
import { Slices } from "shared/slices";
import { Events } from "./network";
import { DispatchSerializer } from "shared/player-producer";

export type RootState = InferState<typeof RootProducer>;
export type RootActions = InferActions<typeof RootProducer>;
export const RootProducer = combineProducers({
	...Slices,
});

const broadcaster = createBroadcaster({
	producers: Slices,
	dispatch: (player: Player, actions: BroadcastAction[]) => {
		Events.Dispatch.fire(player, DispatchSerializer.serialize(actions), "global");
	},
});
RootProducer.applyMiddleware(broadcaster.middleware);

Events.StartReplication.connect((player) => broadcaster.start(player));
