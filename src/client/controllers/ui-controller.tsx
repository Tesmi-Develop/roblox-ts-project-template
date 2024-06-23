import { Controller, OnStart } from "@flamework/core";
import { createPortal, createRoot } from "@rbxts/react-roblox";
import React from "@rbxts/react";
import { LocalPlayer } from "shared/utilities/constants";
import { OnDataReplicated, PlayerController } from "./player-controller";
import { App } from "client/ui/app";
import { Inject } from "shared/decorators/field/inject";
import { subscribe } from "@rbxts/charm";
import RootProducer from "client/ui/store";

const root = createRoot(new Instance("Folder"));
const PlayerGui = LocalPlayer?.WaitForChild("PlayerGui") as PlayerGui;

@Controller({})
export class UiController implements OnDataReplicated, OnStart {
	@Inject
	private playerController!: PlayerController;

	public onStart() {
		this.initSyncRootProducer();
	}

	public OnDataReplicated() {
		root.render(createPortal(<App />, PlayerGui));
	}

	private initSyncRootProducer() {
		const atoms = this.playerController.GetAtoms();

		subscribe(atoms.playerData, (state) =>
			RootProducer.setState({
				...RootProducer.getState(),
				playerData: state,
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
