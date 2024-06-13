import { Controller } from "@flamework/core";
import { ReplicatedStorage } from "@rbxts/services";
import { IS_DEV } from "shared/utilities/constants";

const event = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS") as RemoteEvent;
const enabled = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS_ENABLED") as BoolValue;

const IsEnableReflexDevTools = () => IS_DEV && event && enabled && enabled.Value;

@Controller({})
export class ReflexDevToolController {
	public DisplayData(name: string, data: unknown) {
		if (IsEnableReflexDevTools()) {
			event.FireServer({ name: name, args: [], state: data });
		}
	}
}
