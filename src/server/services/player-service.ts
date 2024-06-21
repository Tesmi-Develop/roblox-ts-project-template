/* eslint-disable @typescript-eslint/no-explicit-any */
import { Components } from "@flamework/components";
import { Service, OnStart, Flamework, Modding } from "@flamework/core";
import { Atom } from "@rbxts/charm";
import { AnalyticsService, Players, StarterGui } from "@rbxts/services";
import { SharedComponentHandler } from "@rbxts/shared-components-flamework";
import { PlayerComponent } from "server/components/player-component";
import { Events, Functions } from "server/network";
import { ActionConstructors } from "shared/decorators/constructor/action-decorator";
import { Inject } from "shared/decorators/field/inject";
import { ActionSerializer, SyncerType } from "shared/network";
import { FailedProcessAction } from "shared/utilities/function-utilities";
import {
	ForeachInitedPlayers,
	GetPlayerComponent,
	PromisePlayerDisconnected,
	WaitPlayerComponent,
} from "shared/utilities/player";
import { IAction } from "types/IAction";
import { OnPlayerJoined, OnPlayerLeaved } from "types/player/player-events";
import { GameDataService } from "./game-data-service";
import { AtomObserver } from "@rbxts/observer-charm";
import("@rbxts/shared-components-flamework");

const validateActionData = Flamework.createGuard<IAction>();

@Service({})
export class PlayerService implements OnStart {
	@Inject
	private components!: Components;

	@Inject
	private sharedComponentHandler!: SharedComponentHandler;
	private observer!: AtomObserver;

	@Inject
	private gameDataService!: GameDataService;

	public onStart() {
		this.observer = this.sharedComponentHandler.GetAtomObserver();
		this.clearStarterGUI();

		Players.PlayerAdded.Connect((player) => {
			this.components.addComponent<PlayerComponent>(player);

			PromisePlayerDisconnected(player).then(async () => {
				(await this.components.waitForComponent<PlayerComponent>(player)).TryDestroy();
			});
		});

		this.connectNetworkFunctions();
		this.handlePlayersJoined();
		this.handlePlayersLeaved();
	}

	public ConnectPlayerSync(
		playerAtom: Atom<any>,
		callback: (payload: { type: "init" | "patch"; data: Record<keyof SyncerType, unknown> }) => void,
	) {
		const connection1 = this.observer.Connect(playerAtom as never, (payload) => {
			const patch = payload.data;
			payload.data = {
				playerData: patch,
			};
			callback(payload as never);
		});

		const connection2 = this.observer.Connect(this.gameDataService.GetAtom() as never, (payload) => {
			const patch = payload.data;
			payload.data = {
				gameData: patch,
			};
			callback(payload as never);
		});

		return () => {
			connection1();
			connection2();
		};
	}

	public GenerateHydratePayload(playerAtom: Atom<any>) {
		return {
			type: "init",
			data: {
				playerData: playerAtom(),
				gameData: this.gameDataService.GetAtom()(),
			},
		};
	}

	private clearStarterGUI() {
		StarterGui.GetChildren().forEach((instance) => instance.Destroy());
	}

	private handlePlayersJoined() {
		const listeners = new Set<OnPlayerJoined>();

		Modding.onListenerAdded<OnPlayerJoined>((object) => listeners.add(object));
		Modding.onListenerRemoved<OnPlayerJoined>((object) => listeners.delete(object));

		PlayerComponent.onAdded((playerComponent) => {
			listeners.forEach((listener) => listener.OnPlayerJoined(playerComponent));
		});

		ForeachInitedPlayers((player) =>
			listeners.forEach((listener) => task.spawn(() => listener.OnPlayerJoined(player))),
		);
	}

	private handlePlayersLeaved() {
		const listeners = new Set<OnPlayerLeaved>();

		Modding.onListenerAdded<OnPlayerLeaved>((object) => listeners.add(object));
		Modding.onListenerRemoved<OnPlayerLeaved>((object) => listeners.delete(object));

		PlayerComponent.onRemoved((playerComponent) => {
			listeners.forEach((listener) => listener.OnPlayerLeaved(playerComponent));
		});
	}

	private connectNetworkFunctions() {
		Functions.DoAction.setCallback((player, actionBuffer) => {
			const actionData = ActionSerializer.deserialize(actionBuffer.buffer, actionBuffer.blobs);
			const playerComponent = GetPlayerComponent(player);
			const actionConstructor = ActionConstructors.get(actionData.Name);

			if (!actionConstructor) return FailedProcessAction("Action not found");
			if (!validateActionData(actionData)) return FailedProcessAction("Invalid action data");
			if (!playerComponent || !playerComponent.IsStatus("Started"))
				return FailedProcessAction("Player not initialized");

			const action = new actionConstructor(actionData.Data as never);
			if (!action.validate()) return FailedProcessAction("Invalid action data");

			action.SetPlayerComponent(playerComponent);

			try {
				return action.DoAction();
			} catch (error) {
				warn(`[PlayerService: ${player.Name}] ${error} \n ${debug.traceback()}`);
			}

			return FailedProcessAction("Failed to process action");
		});

		Events.StartReplication.connect(async (player) => {
			if (GetPlayerComponent(player)?.IsStatus("Started")) return;

			const playerComponent = await WaitPlayerComponent(player);
			await playerComponent.WaitForStatus("WaitForStarting");
			playerComponent.StartReplication();
		});
	}
}
