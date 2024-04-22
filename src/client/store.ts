import {
	InferState,
	InferActions,
	combineProducers,
	createBroadcastReceiver,
	ProducerMiddleware,
	Selector,
} from "@rbxts/reflex";
import { Slices } from "shared/slices";
import { Events } from "./network";
import { ReplicatedStorage, RunService } from "@rbxts/services";
import { SelectPlayerData } from "shared/slices/save-slice";
import { LocalPlayer } from "shared/utilities/constants";
import { PlayerSelector, PlayerSelectorParamenter, ReturnGetReflexData } from "shared/utilities/player";
import { ClientSlices } from "./slices";

export type RootState = InferState<typeof RootProducer>;
export type RootActions = InferActions<typeof RootProducer>;
export type RootProducer = typeof RootProducer;
export const RootProducer = combineProducers({
	...ClientSlices,
	...Slices,
});

const event = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS") as RemoteEvent;
const enabled = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS_ENABLED") as BoolValue;

export const devToolsMiddleware: ProducerMiddleware<RootState, RootActions> = () => {
	return (nextAction, actionName) => {
		return (...args) => {
			const state = nextAction(...args);

			if (RunService.IsStudio() && event && enabled && enabled.Value) {
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

export const GetServerData = <S extends PlayerSelector | unknown = unknown>(
	selector?: S,
	...args: PlayerSelectorParamenter<S>
) =>
	selector
		? (RootProducer.getState((selector as Callback)(LocalPlayer.Name, ...args)) as ReturnGetReflexData<S>)
		: (RootProducer.getState(SelectPlayerData(LocalPlayer.Name)) as ReturnGetReflexData<S>);

RootProducer.applyMiddleware(receiver.middleware);
RootProducer.applyMiddleware(devToolsMiddleware);

Events.Dispatch.connect((actions) => receiver.dispatch(actions));

_G.ROOT_PRODUCER = RootProducer;
export default RootProducer;
