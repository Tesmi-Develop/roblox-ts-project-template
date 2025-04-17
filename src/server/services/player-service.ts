/* eslint-disable @typescript-eslint/no-explicit-any */
import { Components } from "@flamework/components";
import { Flamework, Modding, OnStart, Service } from "@flamework/core";
import { Logger } from "@rbxts/log";
import Signal from "@rbxts/rbx-better-signal";
import { Players, StarterGui } from "@rbxts/services";
import { PlayerComponent } from "server/components/player-component";
import { Events, Functions } from "server/network";
import { WaitForEndTestMode } from "server/utility-for-tests/test-mode";
import { ActionConstructors } from "shared/decorators/constructor/action-decorator";
import { InjectType } from "shared/decorators/field/Inject-type";
import { Instantiate } from "shared/flamework-utils";
import { ActionSerializer } from "shared/network";
import { IS_STUDIO } from "shared/utilities/constants";
import { FailedProcessAction } from "shared/utilities/function-utilities";
import {
	ForeachStartedPlayers,
	GetPlayerComponent,
	PromisePlayerDisconnected,
	WaitPlayerComponent,
} from "shared/utilities/player";
import { IAction } from "types/IAction";
import { OnPlayerJoined, OnPlayerLeaved } from "types/player/player-events";
import("@rbxts/shared-components-flamework");

const validateActionData = Flamework.createGuard<IAction>();

@Service({})
export class PlayerService implements OnStart {
	@InjectType
	private components!: Components;

	@InjectType
	private logger!: Logger;

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

	public GetPlayer(userId: number) {
		const player = this.players.get(tostring(userId));
		assert(player, "Player not found");

		return player;
	}

	public TryGetPlayer(userId: number) {
		const player = this.players.get(tostring(userId));
		if (!player) return undefined;

		return player;
	}

	public async onStart() {
		this.clearStarterGUI();

		const processPlayer = async (player: Player) => {
			this.logger.Info(`Player ${player.Name} joined the server`);
			await WaitForEndTestMode();

			const component = this.components.addComponent<PlayerComponent>(player);

			PromisePlayerDisconnected(player).then(() => {
				component.TryDestroy();
			});
		};

		if (!IS_STUDIO) {
			Players.PlayerAdded.Connect(processPlayer);
			Players.GetPlayers().forEach(processPlayer);
		}

		this.connectNetworkFunctions();
		this.handlePlayersJoined();
		this.handlePlayersLeaved();
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
		if (IS_STUDIO) return;

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

			const playerComponent = await WaitPlayerComponent(player);
			if (playerComponent.IsStatus("Started")) return;

			await playerComponent.WaitForStatus("WaitForStarting");
			playerComponent.StartReplication();
		});
	}
}
