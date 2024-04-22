import { Dependency, Flamework, Modding, OnStart, Reflect } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { RootProducer } from "server/store";
import { SelectPlayerData, dataSlice } from "shared/slices/save-slice";
import {
	CharacterAddedWithValidate,
	PlayerSelector,
	PlayerSelectorParamenter,
	PromisePlayerDisconnected,
	ReturnGetReflexData,
} from "shared/utilities/player";
import { PlayerService } from "server/services/player-service";
import {
	OnStartModule,
	OnSendData,
	PlayerModules,
	OnStopModule,
} from "shared/decorators/constructor/player-module-decorator";
import { Events } from "server/network";
import { DeepCloneTable, GetIdentifier } from "shared/utilities/object-utilities";
import { InferActions, Selector } from "@rbxts/reflex";
import { Inject } from "shared/decorators/method/inject";
import { OmitFirstParam, OmitMultipleParams } from "types/utility";
import { Janitor } from "@rbxts/janitor";
import { promiseR15 } from "@rbxts/character-promise";
import Signal from "@rbxts/rbx-better-signal";
import { GetCurrentTime } from "shared/utilities/function-utilities";
import { Profile } from "@rbxts/profileservice/globals";
import { PlayerData, PlayerSave } from "types/player/player-data";
import { Tags } from "shared/tags";
import { Collisions } from "shared/collisions";
import { PlayerDataSchema } from "shared/schemas/player-data";

//#region Types
type DataSliceActions = InferActions<typeof dataSlice>;

type PlayerActions = {
	[K in keyof DataSliceActions]: (
		...args: Parameters<OmitMultipleParams<DataSliceActions[K], 2>>
	) => ReturnType<DataSliceActions[K]>;
};
//#endregion

@Component({})
export class PlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	public readonly Name = this.instance.Name;
	public readonly UserId = this.instance.UserId;
	public readonly Actions = {} as PlayerActions;
	public readonly Janitor = new Janitor();

	@Inject()
	private playerService!: PlayerService;
	private destroyConnections: (() => void)[] = [];
	private modules = new Map<string, object>();
	private orderedModules: [object, number][] = [];
	private isInitialized = false;
	private initializeSignal?: Signal<() => void>;

	public static onAdded(callback: (component: PlayerComponent, player: Player) => void) {
		return Dependency<Components>().onComponentAdded<PlayerComponent>(async (component, player) => {
			await component.WaitForInitialized();
			callback(component, player as Player);
		});
	}

	public static onRemoved(callback: (component: PlayerComponent, player: Player) => void) {
		return Dependency<Components>().onComponentRemoved<PlayerComponent>(callback as never);
	}

	async onStart() {
		this.initActions();
		const dynamicData = DeepCloneTable(PlayerDataSchema.Dynamic);

		// Step 1: Initilize all modules
		this.initModules();

		// Step 2: Load profile data
		const profileData = await this.initProfile();

		// Step 3: Invoke onSendData
		this.invokeOnSendDataEvent({ Save: profileData, Dynamic: dynamicData });

		// Step 4: Set player data
		this.Actions.SetPlayerData({
			Dynamic: DeepCloneTable(dynamicData),
			Save: DeepCloneTable(profileData),
		});

		this.isInitialized = true;
		this.initializeSignal?.Fire();
		this.initializeSignal?.Destroy();
		this.initializeSignal = undefined;

		this.initCollision();

		// Step 5: Invoke onStartModule
		this.orderedModules.forEach(([module]) => {
			if (!Flamework.implements<OnStartModule>(module)) return;

			task.spawn(() => {
				try {
					module.OnStartModule();
				} catch (error) {
					warn(`[PlayerComponent: ${this.instance.Name}] ${error}`);
				}
			});
		});
	}

	private invokeOnSendDataEvent(data: PlayerData) {
		this.orderedModules.forEach(([module]) => {
			if (!Flamework.implements<OnSendData>(module)) return;

			try {
				module.OnSendData(data.Save, data.Dynamic);
			} catch (error) {
				warn(`[PlayerComponent: ${this.instance.Name}] ${error}`);
			}
		});
	}

	public ResetData() {
		const data = DeepCloneTable(PlayerDataSchema);
		this.invokeOnSendDataEvent(data);

		this.Actions.SetPlayerData(DeepCloneTable(data));
	}

	public GetInitialized() {
		return this.isInitialized;
	}

	/**
	 * @metadata macro
	 */
	public GetModule<T>(moduleSpecifier?: Modding.Generic<T, "id">): T {
		assert(moduleSpecifier, "Must specify a module");

		const module = this.modules.get(`${moduleSpecifier}`) as T;
		assert(module, `Module ${moduleSpecifier} not decorated`);

		return module as T;
	}

	public async WaitForInitialized() {
		if (this.GetInitialized()) return;

		!this.initializeSignal && (this.initializeSignal = new Signal());
		this.initializeSignal.Wait();
	}

	public GetReflexData<S extends PlayerSelector | unknown = unknown>(
		selector?: S,
		...args: PlayerSelectorParamenter<S>
	): ReturnGetReflexData<S> {
		return selector
			? (RootProducer.getState((selector as Callback)(this.instance.Name, ...args)) as ReturnGetReflexData<S>)
			: (RootProducer.getState().Data[this.instance.Name]! as ReturnGetReflexData<S>);
	}

	private proccessNewCharacter(character: Model) {
		character.AddTag(Tags.Character);
		character.GetChildren().forEach((bodyPart) => {
			if (!bodyPart.IsA("BasePart")) return;
			bodyPart.CollisionGroup = Collisions.Player;
		});
	}

	private initCollision() {
		this.Janitor.Add(
			CharacterAddedWithValidate(this.instance, (character) => this.proccessNewCharacter(character)),
		);

		if (this.instance.Character) {
			promiseR15(this.instance.Character).then((char) => this.proccessNewCharacter(char));
		}
	}

	private initActions() {
		setmetatable(this.Actions, {
			__index:
				(_, key) =>
				(...args: unknown[]) => {
					RootProducer[key as keyof DataSliceActions](this.instance.Name, ...(args as never[]));
				},
		});
	}

	private releaseProfile(profile: Profile<PlayerSave>) {
		profile.Data.LastUpdate = GetCurrentTime();
		profile.Release();
	}

	private onFailedLoadProfile() {
		this.ConnectOnLeaveSynced(() => this.Actions.DeletePlayerData());
	}

	private initProfile() {
		return new Promise<PlayerSave>((resolve) => {
			this.playerService
				.LoadProfile(this.instance)
				.then((profile) => {
					const disconnect = RootProducer.subscribe(SelectPlayerData(this.instance.Name), (data) => {
						if (!data) return;
						profile.Data = data.Save;
					});

					this.Janitor.Add(() => {
						RootProducer.DeletePlayerData(this.instance.Name);
						disconnect();
						this.releaseProfile(profile);
					});

					resolve(profile.Data);
				})
				.catch(() => {
					this.onFailedLoadProfile();
					resolve(DeepCloneTable(PlayerDataSchema.Save));
				});
		});
	}

	private initModules() {
		const constructors = PlayerModules;

		constructors.forEach((obj) => {
			const instance = new obj(this as never);
			this.modules.set(GetIdentifier(obj), instance);
		});

		this.modules.forEach((module) => {
			const loadOrder = Reflect.getMetadata<number>(module, "playerModule:loadOrder") ?? 1;
			this.orderedModules.push([module, loadOrder]);
		});

		this.orderedModules.sort(([_, Aorder], [__, Border]) => {
			return Aorder < Border;
		});
	}

	public ConnectOnLeaveSynced(callback: () => void) {
		this.destroyConnections.push(callback);
		let isConnected = true;

		return () => {
			if (!isConnected) return;
			const index = this.destroyConnections.indexOf(callback);
			index !== -1 && this.destroyConnections.remove(index);
			isConnected = false;
		};
	}

	public destroy() {
		this.orderedModules.forEach(([module]) => {
			if (Flamework.implements<OnStopModule>(module)) {
				const [success, output] = pcall(() => module.OnStopModule());

				!success && warn(`[PlayerComponent: ${this.instance.Name}] ${output}`);
			}
		});

		this.destroyConnections.forEach((callback) => {
			const [success, output] = pcall(() => callback());

			!success && warn(`[PlayerComponent: ${this.instance.Name}] ${output}`);
		});

		super.destroy();
		this.Janitor.Destroy();
	}
}
