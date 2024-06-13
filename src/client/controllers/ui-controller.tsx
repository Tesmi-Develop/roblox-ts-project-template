import { Controller } from "@flamework/core";
import { createPortal, createRoot } from "@rbxts/react-roblox";
import React from "@rbxts/react";
import { App } from "client/ui/app";
import { LocalPlayer } from "shared/utilities/constants";
import { OnDataReplicated } from "./player-controller";

const root = createRoot(new Instance("Folder"));
const PlayerGui = LocalPlayer?.WaitForChild("PlayerGui") as PlayerGui;

@Controller({})
export class UiController implements OnDataReplicated {
	public OnDataReplicated() {
		root.render(createPortal(<App />, PlayerGui));
	}
}
