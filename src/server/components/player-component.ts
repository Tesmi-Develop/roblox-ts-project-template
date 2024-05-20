import { Dependency, Flamework, Modding, OnStart, Reflect } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { CharacterAddedWithValidate } from "shared/utilities/player";
import {
	OnStartModule,
	OnSendData,
	PlayerModules,
	OnStopModule,
} from "shared/decorators/constructor/player-module-decorator";
import { DeepCloneTable, GetIdentifier } from "shared/utilities/object-utilities";
import {
	BroadcastAction,
	Broadcaster,
	combineProducers,
	createBroadcaster,
	InferActions,
	Selector,
} from "@rbxts/reflex";
import { Inject } from "shared/decorators/field/inject";
import { VoidCallback } from "types/utility";
import { Janitor } from "@rbxts/janitor";
import { promiseR15 } from "@rbxts/character-promise";
import Signal from "@rbxts/rbx-better-signal";
import {
	CreateInstanceWithountCallingConstructor,
	GetCurrentTime,
	logAssert,
} from "shared/utilities/function-utilities";
import { PlayerData, PlayerSave } from "types/player/player-data";
import { Tags } from "shared/tags";
import { Collisions } from "shared/collisions";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { INJECT_PLAYER_KEY } from "shared/decorators/field/Inject-player";
import { t } from "@rbxts/t";
import { INJECT_PLAYER_MODULE_KEY } from "shared/decorators/field/Inject-player-module";
import { Events } from "server/network";
import { CombinePlayerSlices, DispatchSerializer, PlayerSlice, PlayerState } from "shared/player-producer";
import { Players } from "@rbxts/services";
import { Constructor } from "@flamework/core/out/utility";
import { Document } from "@rbxts/lapis";
import { DataStoreWrapperService } from "server/services/data-store-service";

const HYDRATE_RATE = -1;

type Status = "Initializing" | "WaitForStarting" | "Started" | "Destroyed";
export type PlayerDispatchers = ReturnType<CombinePlayerSlices["getDispatchers"]>;

export interface IPlayerInteraction {
	Actions: PlayerDispatchers;
	SaveProfile: () => Promise<void>;
	SetData: (data: PlayerData) => void;
	UnlockComponent: () => void;
}

@Component({})
export class PlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	public readonly Name = this.instance.Name;
	public readonly UserId = this.instance.UserId;
	public readonly Actions = {} as PlayerDispatchers;
	public readonly Janitor = new Janitor();

	@Inject()
	private dataStore!: DataStoreWrapperService;
	@Inject()
	private components!: Components;
	private destroyConnections: (() => void)[] = [];
	private modules = new Map<string, object>();
	private orderedModules: [object, number][] = [];
	private status: Status = "Initializing";
	private statusSignals = new Map<Status, Signal<() => void>>();
	private producer!: CombinePlayerSlices;
	private broadcaster!: Broadcaster;
	private profile!: Document<PlayerSave>;
	private isKeepMode = false;
	private isLocked = false;

	public static onAdded(callback: (component: PlayerComponent, player: Player) => void) {
		return Dependency<Components>().onComponentAdded<PlayerComponent>(async (component, player) => {
			await component.WaitForStatus("Started");
			callback(component, player as Player);
		});
	}

	public static onRemoved(callback: (component: PlayerComponent, player: Player) => void) {
		return Dependency<Components>().onComponentRemoved<PlayerComponent>(callback as never);
	}

	public async onStart() {
		const dynamicData = DeepCloneTable(PlayerDataSchema.Dynamic);

		// Step 1: Initilize all modules
		this.initModules();

		// Step 2: Load profile data
		const profileData = await this.initProfile();
		const playerData = { Save: profileData, Dynamic: dynamicData };

		// Step 3: Invoke onSendData
		this.invokeOnSendDataEvent(playerData);

		// Step 4: Initialize producer
		this.initProducer(playerData);
		this.initActions();

		// Step 5: Ready to initialize
		this.setStatus("WaitForStarting");

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

	public ResetData() {
		const data = DeepCloneTable(PlayerDataSchema);
		this.invokeOnSendDataEvent(data);

		this.producer.setState({ PlayerData: data });
	}

	public SetData(data: PlayerData) {
		if (this.isLocked) return;
		this.setData(data);
	}

	public Keep() {
		this.isKeepMode = true;
	}

	public Release() {
		this.isKeepMode = false;
		this.TryDestroy();
	}

	public GetLocked() {
		return this.isLocked;
	}

	public LockComponent(): IPlayerInteraction {
		assert(!this.isLocked, "Component is already locked");
		this.isLocked = true;

		const actions = {} as PlayerDispatchers;

		setmetatable(actions, {
			__index:
				(_, key) =>
				(...args: unknown[]) =>
					this.processAction(key as string, ...args),
		});

		return {
			Actions: actions,
			SaveProfile: () => this.saveProfile(),
			SetData: (data: PlayerData) => this.setData(data),
			UnlockComponent: () => (this.isLocked = false),
		};
	}

	/** @metadata macro */
	public GetModule<T>(moduleSpecifier?: Modding.Generic<T, "id">): T {
		assert(moduleSpecifier, "Must specify a module");

		const module = this.modules.get(`${moduleSpecifier}`) as T;
		assert(module, `Module ${moduleSpecifier} not decorated`);

		return module as T;
	}

	public GetStatus() {
		return this.status;
	}

	public IsStatus(status: Status) {
		return this.GetStatus() === status;
	}

	public async WaitForStatus(status: Status) {
		if (this.IsStatus(status)) return;

		!this.statusSignals.has(status) && this.statusSignals.set(status, new Signal());
		this.statusSignals.get(status)!.Wait();
	}

	public GetData(): PlayerState;
	public GetData<S>(selector: Selector<PlayerState, S>): S;

	public GetData(selector?: Selector<PlayerState, unknown>) {
		this.validateInitialized();
		return this.producer.getState(selector as never);
	}

	public Subscribe(listener: (state: PlayerData, previousState: PlayerData) => void): () => void;

	public Subscribe<T>(selector: (state: PlayerData) => T, listener: (state: T, previousState: T) => void): () => void;

	public Subscribe<T>(
		selector: (state: PlayerData) => T,
		predicate: ((state: T, previousState: T) => boolean) | undefined,
		listener: (state: T, previousState: T) => void,
	): () => void;

	public Subscribe(...args: unknown[]) {
		this.validateInitialized();
		return this.producer.subscribe(...(args as Parameters<typeof this.producer["subscribe"]>));
	}

	public StartReplication() {
		if (!this.IsStatus("WaitForStarting")) return;

		this.broadcaster.start(this.instance);
		this.setStatus("Started");
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

	public async SaveProfile() {
		if (!this.IsStatus("Initializing")) return;
		if (!this.isLocked) return;

		return await this.saveProfile();
	}

	private saveProfile() {
		return this.profile.save();
	}

	private setData(data: PlayerData) {
		this.producer.setState({ PlayerData: data });
		this.profile.write(data.Save);
	}

	private setStatus(status: Status) {
		this.status = status;
		this.statusSignals.get(status)?.Fire();
		this.statusSignals.get(status)?.Destroy();
		this.statusSignals.delete(status);
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

	public TryDestroy() {
		if (this.instance.IsDescendantOf(Players)) return false;
		if (!this.IsStatus("Started")) return false;
		if (this.isKeepMode) return false;

		this.components.removeComponent<PlayerComponent>(this.instance);
		return true;
	}

	private validateInitialized() {
		logAssert(!this.IsStatus("Initializing"), "PlayerComponent must be initialized");
	}

	private processAction(actionName: string, ...args: unknown[]) {
		if (!this.IsStatus("Started")) return;

		const state = (this.producer[actionName as never] as Callback)(...(args as [])) as PlayerState;
		this.profile.write(state.PlayerData.Save);
	}

	private initActions() {
		setmetatable(this.Actions, {
			__index:
				(_, key) =>
				(...args: unknown[]) =>
					!this.isLocked && this.processAction(key as string, ...args),
		});
	}

	private initProducer(playerData: PlayerData) {
		this.producer = combineProducers(PlayerSlice);

		this.broadcaster = createBroadcaster({
			producers: PlayerSlice,
			hydrateRate: HYDRATE_RATE,
			dispatch: (player: Player, actions: BroadcastAction[]) => {
				Events.Dispatch.fire(player, DispatchSerializer.serialize(actions), "playerData");
			},
		});

		this.producer.setState({ PlayerData: playerData });
		this.producer.applyMiddleware(this.broadcaster.middleware);
		this.Janitor.Add(this.producer, "destroy");
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

	private async releaseProfile() {
		const data = this.profile.read();
		this.profile.write({ ...data, LastUpdate: GetCurrentTime(), IsNewProfile: false });
		await this.profile.close();
	}

	private onFailedLoadProfile() {
		// Here you can handle the fail
		print(`[PlayerComponent: ${this.instance.Name}] Failed to load profile`);
	}

	private initProfile() {
		return new Promise<PlayerSave>((resolve) => {
			this.dataStore
				.LoadProfile(this.instance)
				.then((profile) => {
					this.profile = profile;
					resolve(DeepCloneTable(profile.read()));
				})
				.catch((er: string) => {
					print(`[PlayerComponent: ${this.instance.Name}] ${er}`);
					this.onFailedLoadProfile();
					resolve(DeepCloneTable(PlayerDataSchema.Save));
				});
		});
	}

	private createModule(obj: Constructor) {
		return CreateInstanceWithountCallingConstructor(obj);
	}

	private injectDepepedenciesInModule(instance: object) {
		const injectPlayerComponentProperties = Reflect.getMetadata(instance, INJECT_PLAYER_KEY);
		const injectPlayerModulesProperties = Reflect.getMetadata(instance, INJECT_PLAYER_MODULE_KEY);

		// Step 1 - Inject player components
		if (t.array(t.string)(injectPlayerComponentProperties)) {
			injectPlayerComponentProperties.forEach((property) => {
				instance[property as never] = this as never;
			});
		}

		// Step 2 - Inject player modules
		if (t.map(t.string, t.string)(injectPlayerModulesProperties)) {
			injectPlayerModulesProperties.forEach((moduleSpecifier, property) => {
				instance[property as never] = this.GetModule(moduleSpecifier as never);
			});
		}
	}

	private initModules() {
		const constructors = PlayerModules;
		const moduleConstructors: VoidCallback[] = [];

		// Step 1 - Create Modules
		constructors.forEach((obj) => {
			const [instance, constructor] = this.createModule(obj);
			this.modules.set(GetIdentifier(obj), instance);
			moduleConstructors.push(constructor);
		});

		// Step 2 - Inject dependencies
		this.modules.forEach((module) => this.injectDepepedenciesInModule(module));

		// Step 3 - Call constructors
		moduleConstructors.forEach((constructor) => constructor());

		this.modules.forEach((module, key) => {
			const loadOrder = Reflect.getMetadata<number>(module, "playerModule:loadOrder") ?? 1;
			this.orderedModules.push([module, loadOrder]);
		});

		this.orderedModules.sort(([Aobject, Aorder], [Bobject, Border]) => {
			return Aorder < Border;
		});
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

		this.statusSignals.forEach((signal) => {
			signal.Destroy();
		});
		this.statusSignals.clear();

		this.releaseProfile();
		super.destroy();
		this.Janitor.Destroy();
		this.setStatus("Destroyed");
	}
}
