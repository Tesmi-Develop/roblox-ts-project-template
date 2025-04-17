import { Controller, OnStart } from "@flamework/core";
import { subscribe } from "@rbxts/charm";
import React from "@rbxts/react";
import { createPortal, createRoot } from "@rbxts/react-roblox";
import { StarterGui } from "@rbxts/services";
import { App } from "client/ui/app";
import RootProducer from "client/ui/store";
import { InjectType } from "shared/decorators/field/Inject-type";
import { LocalPlayer } from "shared/utilities/constants";
import { PlayerController } from "./player-controller";

const root = createRoot(new Instance("Folder"));
const PlayerGui = LocalPlayer?.WaitForChild("PlayerGui") as PlayerGui;

@Controller({})
export class UiController implements OnStart {
	@InjectType
	private playerController!: PlayerController;

	public onStart() {
		this.disableRobloxUI();
		this.initSyncRootProducer();

		this.renderApp();
	}

	public renderApp() {
		root.unmount();
		root.render(createPortal(<App />, PlayerGui));
	}

	private disableRobloxUI() {
		StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false);
	}

	private initSyncRootProducer() {
		const atoms = this.playerController.GetAtoms();

		subscribe(atoms.playerData, (state) =>
			RootProducer.setState({
				...RootProducer.getState(),
				playerData: state as never,
			}),
		);

		subscribe(atoms.gameData, (state) =>
			RootProducer.setState({
				...RootProducer.getState(),
				gameData: state,
			}),
		);
	}
}
