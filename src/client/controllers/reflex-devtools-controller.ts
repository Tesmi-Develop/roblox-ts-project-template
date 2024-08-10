import { Controller, OnStart } from "@flamework/core";
import { ReplicatedStorage } from "@rbxts/services";
import { Action } from "shared/actions/action";
import { IS_DEV } from "shared/utilities/constants";

const event = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS") as RemoteEvent;
const enabled = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS_ENABLED") as BoolValue;

const IsEnableReflexDevTools = () => IS_DEV && event && enabled && enabled.Value;

@Controller({})
export class ReflexDevToolsController implements OnStart {
	public onStart() {
		Action.OnGotResponse.Connect((action, response) => {
			if (!IsEnableReflexDevTools()) return;
			if (response.success) return;

			print("This response was rejected: ", action.Name, response.message);
		});
	}

	public DisplayData(name: string, data: unknown, args: unknown[] = []) {
		if (IsEnableReflexDevTools()) {
			event.FireServer({ name: name, args: args, state: data });
		}
	}
}
