import { Components } from "@flamework/components";
import { Service, OnStart, Flamework, Modding } from "@flamework/core";
import { GetProfileStore } from "@rbxts/profileservice";
import { Players, StarterGui } from "@rbxts/services";
import { PlayerComponent } from "server/components/player-component";
import { Functions } from "server/network";
import { ActionConstructors } from "shared/decorators/constructor/action-decorator";
import { Inject } from "shared/decorators/method/inject";
import { DataStoreName } from "shared/schemas/data-store-name";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { FailedProcessAction } from "shared/utilities/function-utilities";
import { ForeachInitedPlayers, GetPlayerComponent, PromisePlayerDisconnected } from "shared/utilities/player";
import { IAction } from "types/IAction";
import { OnPlayerJoined, OnPlayerLeaved } from "types/player/player-events";

const profileStore = GetProfileStore(DataStoreName, PlayerDataSchema["Save"]);
const validateActionData = Flamework.createGuard<IAction>();

@Service({})
export class PlayerService implements OnStart {
	@Inject()
	private components!: Components;

	public onStart() {
		this.clearStarterGUI();

		Players.PlayerAdded.Connect((player) => {
			this.components.addComponent<PlayerComponent>(player);

			PromisePlayerDisconnected(player).then(() => {
				this.components.removeComponent<PlayerComponent>(player);
			});
		});

		this.connectNetworkFunctions();
		this.handlePlayersJoined();
		this.handlePlayersLeaved();
	}

	public async LoadProfile(player: Player) {
		const profile = profileStore.LoadProfileAsync(tostring(player.UserId), () => "Cancel");
		assert(profile, "Failed to load profile");

		profile.AddUserId(player.UserId);
		profile.Reconcile();
		profile.ListenToRelease(() => {
			player.Kick("Profile was released");
		});

		if (!player.IsDescendantOf(Players)) {
			profile.Release();
			error("Failed to load profile");
		}

		return profile;
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
			if (!playerComponent || !playerComponent.GetInitialized())
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
	}
}
