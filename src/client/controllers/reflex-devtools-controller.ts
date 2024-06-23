import { Controller } from "@flamework/core";
import { ReplicatedStorage } from "@rbxts/services";
import { IS_DEV } from "shared/utilities/constants";

const event = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS") as RemoteEvent;
const enabled = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS_ENABLED") as BoolValue;

const IsEnableReflexDevTools = () => IS_DEV && event && enabled && enabled.Value;

@Controller({})
export class ReflexDevToolsController {
	public DisplayData(name: string, data: unknown, args: unknown[] = []) {
		if (IsEnableReflexDevTools()) {
			event.FireServer({ name: name, args: args, state: data });
		}
	}
}
