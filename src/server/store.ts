import { BroadcastAction, InferActions, InferState, combineProducers, createBroadcaster } from "@rbxts/reflex";
import { Slices } from "shared/slices";
import { Events } from "./network";

export type RootState = InferState<typeof RootProducer>;
export type RootActions = InferActions<typeof RootProducer>;
export const RootProducer = combineProducers({
	...Slices,
});

const broadcaster = createBroadcaster({
	producers: Slices,
	dispatch: (player: Player, actions: BroadcastAction[]) => {
		Events.Dispatch.fire(player, actions);
	},

	beforeDispatch: (player, action) => {
		if (action.arguments[0] !== player.Name) {
			return;
		}

		return action;
	},

	beforeHydrate: (player, state) => {
		return {
			Data: {
				[player.Name]: state.Data[player.Name],
			},
		};
	},
});
RootProducer.applyMiddleware(broadcaster.middleware);

Events.StartReplication.connect((player) => broadcaster.start(player));