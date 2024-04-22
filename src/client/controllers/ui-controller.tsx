import { Controller, OnStart } from "@flamework/core";
import { ReflexProvider } from "@rbxts/react-reflex";
import { createPortal, createRoot } from "@rbxts/react-roblox";
import React from "@rbxts/react";
import { RootProducer } from "client/store";
import { App } from "client/ui/app";
import { LocalPlayer } from "shared/utilities/constants";

const root = createRoot(new Instance("Folder"));
const PlayerGui = LocalPlayer?.WaitForChild("PlayerGui") as PlayerGui;

@Controller({})
export class UiController implements OnStart {
	public onStart() {
		root.render(
			createPortal(
				<ReflexProvider producer={RootProducer}>
					<App />
				</ReflexProvider>,
				PlayerGui,
			),
		);
	}
}
