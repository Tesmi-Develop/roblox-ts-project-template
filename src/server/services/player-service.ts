/* eslint-disable @typescript-eslint/no-explicit-any */
import { Components } from "@flamework/components";
import { Flamework, Modding, OnStart, Service } from "@flamework/core";
import { Atom, SyncPayload } from "@rbxts/charm";
import { Players, StarterGui } from "@rbxts/services";
import { SharedComponentHandler } from "@rbxts/shared-components-flamework";
import { PlayerComponent } from "server/components/player-component";
import { Events, Functions } from "server/network";
import { ActionConstructors } from "shared/decorators/constructor/action-decorator";

import { AtomObserver } from "@rbxts/observer-charm";
import Signal from "@rbxts/rbx-better-signal";
import { WaitForEndTestMode } from "server/utility-for-tests/test-mode";
import { InjectType } from "shared/decorators/field/Inject-type";
import { Instantiate } from "shared/flamework-utils";
import { ActionSerializer, PlayerAtoms } from "shared/network";
import { playerData } from "shared/schemas/player-data-types";
import { FailedProcessAction } from "shared/utilities/function-utilities";
import {
	ForeachStartedPlayers,
	GetPlayerComponent,
	PromisePlayerDisconnected,
	WaitPlayerComponent,
} from "shared/utilities/player";
import { IAction } from "types/IAction";
import { OnPlayerJoined, OnPlayerLeaved } from "types/player/player-events";
import { GameDataService } from "./game-data-service";
import("@rbxts/shared-components-flamework");

const validateActionData = Flamework.createGuard<IAction>();

@Service({})
export class PlayerService implements OnStart {
	@InjectType
	private components!: Components;

	@InjectType
	private sharedComponentHandler!: SharedComponentHandler;
	private observer!: AtomObserver;

	@InjectType
	private gameDataService!: GameDataService;

	private players = new Map<string, PlayerComponent>();
	private enableSignals?: Signal;
	private isEnabled = true;

	public readonly Events = Events;
	public readonly Functions = Functions;

	public AddPlayer(player: PlayerComponent) {
		this.players.set(tostring(player.UserId), player);
	}

	public RemovePlayer(player: PlayerComponent) {
		this.players.delete(tostring(player.UserId));
	}

	public GetPlayers() {
		return this.players;
	}

	public async onStart() {
		this.observer = this.sharedComponentHandler.GetAtomObserver();
		this.clearStarterGUI();

		const processPlayer = async (player: Player) => {
			await WaitForEndTestMode();

			const component = this.components.addComponent<PlayerComponent>(player);

			PromisePlayerDisconnected(player).then(() => {
				component.TryDestroy();
			});
		};

		Players.PlayerAdded.Connect(processPlayer);
		Players.GetPlayers().forEach(processPlayer);

		this.connectNetworkFunctions();
		this.handlePlayersJoined();
		this.handlePlayersLeaved();
	}

	public ConnectPlayerSync(playerAtom: Atom<playerData>, callback: (payload: SyncPayload<PlayerAtoms>) => void) {
		const connection1 = this.observer.Connect(playerAtom, (payload) => {
			callback({ type: "patch", data: { playerData: payload } });
		});

		const connection2 = this.observer.Connect(this.gameDataService.GetAtom(), (payload) => {
			callback({ type: "patch", data: { gameData: payload as never } });
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

	public SetEnabled(enabled: boolean) {
		this.isEnabled = enabled;
		if (enabled) {
			this.enableSignals?.Fire();
		}
	}

	private async waitForEnable() {
		if (this.isEnabled) return;
		(this.enableSignals ??= new Signal()).Wait();
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

		ForeachStartedPlayers((player) =>
			listeners.forEach((listener) => Promise.try(() => listener.OnPlayerJoined(player))),
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
		Functions.DoAction.setCallback(async (player, actionBuffer) => {
			const actionData = ActionSerializer.deserialize(actionBuffer.buffer, actionBuffer.blobs) as IAction;
			const playerComponent = GetPlayerComponent(player);
			const actionConstructor = ActionConstructors.get(actionData.Name);

			if (!actionConstructor) return FailedProcessAction("Action not found");
			if (!validateActionData(actionData)) return FailedProcessAction("Invalid action data");
			if (!playerComponent || !playerComponent.IsStatus("Started"))
				return FailedProcessAction("Player not initialized");

			const action = Instantiate(actionConstructor, [actionData.Data as never]);
			if (!action.validate()) return FailedProcessAction("Invalid action data");

			action.SetPlayerComponent(playerComponent);

			try {
				const result = action.DoAction();
				return Promise.is(result) ? await result : result;
			} catch (error) {
				warn(`[PlayerService: ${player.Name}] ${error} \n ${debug.traceback()}`);
			}

			return FailedProcessAction("Failed to process action");
		});

		Events.StartReplication.connect(async (player) => {
			await this.waitForEnable();
			if (GetPlayerComponent(player)?.IsStatus("Started")) return;

			const playerComponent = await WaitPlayerComponent(player);
			await playerComponent.WaitForStatus("WaitForStarting");
			playerComponent.StartReplication();
		});
	}
}
