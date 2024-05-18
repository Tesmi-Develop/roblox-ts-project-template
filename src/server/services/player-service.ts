import { Components } from "@flamework/components";
import { Service, OnStart, Flamework, Modding } from "@flamework/core";
import { createCollection, setConfig } from "@rbxts/lapis";
import { Players, StarterGui } from "@rbxts/services";
import { PlayerTransaction } from "server/classes/player-transaction";
import { PlayerComponent } from "server/components/player-component";
import { Events, Functions } from "server/network";
import { ActionConstructors } from "shared/decorators/constructor/action-decorator";
import { Inject } from "shared/decorators/field/inject";
import { DataStoreName } from "shared/schemas/data-store-name";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { FailedProcessAction } from "shared/utilities/function-utilities";
import {
	ForeachInitedPlayers,
	GetPlayerComponent,
	PromisePlayerDisconnected,
	WaitPlayerComponent,
} from "shared/utilities/player";
import { IAction } from "types/IAction";
import { OnPlayerJoined, OnPlayerLeaved } from "types/player/player-events";

const validateActionData = Flamework.createGuard<IAction>();

@Service({})
export class PlayerService implements OnStart {
	@Inject()
	private components!: Components;

	public onStart() {
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
		Functions.DoAction.setCallback((player, actionData) => {
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
