import { InferState, InferActions, combineProducers, createBroadcastReceiver, ProducerMiddleware } from "@rbxts/reflex";
import { Slices } from "shared/slices";
import { Events } from "./network";
import { ReplicatedStorage, RunService } from "@rbxts/services";
import { ClientSlices } from "./slices";
import { DispatchSerializer, PlayerSlice } from "shared/player-producer";

export type RootState = InferState<typeof RootProducer>;
export type RootActions = InferActions<typeof RootProducer>;
export type RootProducer = typeof RootProducer;
export const RootProducer = combineProducers({
	...ClientSlices,
	...Slices,
	...PlayerSlice,
});

const event = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS") as RemoteEvent;
const enabled = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS_ENABLED") as BoolValue;

const IsEnableReflexDevTools = () => RunService.IsStudio() && event && enabled && enabled.Value;

export const devToolsMiddleware: ProducerMiddleware<RootState, RootActions> = () => {
	return (nextAction, actionName) => {
		return (...args) => {
			const state = nextAction(...args);

			if (IsEnableReflexDevTools()) {
				event.FireServer({ name: actionName, args: [...args], state });
			}

			return state;
		};
	};
};

const receiver = createBroadcastReceiver({
	start: () => {
		Events.StartReplication.fire();
	},
});

RootProducer.applyMiddleware(receiver.middleware);
RootProducer.applyMiddleware(devToolsMiddleware);

Events.Dispatch.connect((bufferActions, _type) => {
	const actions = DispatchSerializer.deserialize(bufferActions.buffer, bufferActions.blobs);
	receiver.dispatch(actions);
	if (IsEnableReflexDevTools()) {
		actions.forEach((action) => {
			if (action.name !== "__hydrate__") return;
			event.FireServer({ name: `Hydrate ${_type}`, args: [], state: RootProducer.getState() });
		});
	}
});

_G.ROOT_PRODUCER = RootProducer;
export default RootProducer;
