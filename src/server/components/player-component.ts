import { Dependency, Flamework, Modding, OnStart, Reflect } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { CharacterAddedWithValidate } from "shared/utilities/player";
import { PlayerService } from "server/services/player-service";
import {
	OnStartModule,
	OnSendData,
	PlayerModules,
	OnStopModule,
} from "shared/decorators/constructor/player-module-decorator";
import { DeepCloneTable, GetIdentifier } from "shared/utilities/object-utilities";
import { BroadcastAction, Broadcaster, createBroadcaster, createProducer, Producer, Selector } from "@rbxts/reflex";
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
import { Profile } from "@rbxts/profileservice/globals";
import { PlayerData, PlayerSave } from "types/player/player-data";
import { Tags } from "shared/tags";
import { Collisions } from "shared/collisions";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { Constructor } from "@flamework/core/out/utility";
import { INJECT_PLAYER_KEY } from "shared/decorators/field/Inject-player";
import { t } from "@rbxts/t";
import { INJECT_PLAYER_MODULE_KEY } from "shared/decorators/field/Inject-player-module";
import { Events } from "server/network";
import { playerProducer } from "shared/player-producer";
import { Players } from "@rbxts/services";

@Component({})
export class PlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	public readonly Name = this.instance.Name;
	public readonly UserId = this.instance.UserId;
	public readonly Actions = {} as ReturnType<typeof playerProducer["getDispatchers"]>;
	public readonly Janitor = new Janitor();

	@Inject()
	private playerService!: PlayerService;
	@Inject()
	private components!: Components;
	private destroyConnections: (() => void)[] = [];
	private modules = new Map<string, object>();
	private orderedModules: [object, number][] = [];
	private isInitialized = false;
	private isStartedReplication = false;
	private initializeSignal?: Signal<() => void>;
	private producer!: typeof playerProducer;
	private broadcaster!: Broadcaster;
	private profile!: Profile<PlayerSave>;
	private isLocked = false;

	public static onAdded(callback: (component: PlayerComponent, player: Player) => void) {
		return Dependency<Components>().onComponentAdded<PlayerComponent>(async (component, player) => {
			await component.WaitForInitialized();
			callback(component, player as Player);
		});
	}

	public static onRemoved(callback: (component: PlayerComponent, player: Player) => void) {
		return Dependency<Components>().onComponentRemoved<PlayerComponent>(callback as never);
	}

	public async onStart() {
		this.initActions();
		const dynamicData = DeepCloneTable(PlayerDataSchema.Dynamic);

		// Step 1: Initilize all modules
		this.initModules();

		// Step 2: Load profile data
		const profileData = await this.initProfile();
		task.wait(10);
		const playerData = { Save: profileData, Dynamic: dynamicData };

		// Step 3: Invoke onSendData
		this.invokeOnSendDataEvent(playerData);

		// Step 4: Initialize producer
		this.initProducer(playerData);

		// Step 5: Ready to initialize
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

	public ResetData() {
		const data = DeepCloneTable(PlayerDataSchema);
		this.invokeOnSendDataEvent(data);

		this.producer.setState(data);
	}

	public GetInitialized() {
		return this.isInitialized;
	}

	public GetStartedReplication() {
		return this.isStartedReplication;
	}

	public LockComponent() {
		this.isLocked = true;
	}

	public UnlockComponent() {
		this.isLocked = false;
		this.TryDestroy();
	}

	/** @metadata macro */
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

	public GetData(): PlayerData;
	public GetData<S>(selector: Selector<PlayerData, S>): S;

	public GetData(selector?: Selector<PlayerData, unknown>) {
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
		return this.producer.subscribe(...(args as Parameters<Producer["subscribe"]>));
	}

	public StartReplication() {
		if (!this.isInitialized || this.isStartedReplication) return;

		this.broadcaster.start(this.instance);
		this.isStartedReplication = true;
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

	public TryDestroy(): boolean {
		if (this.instance.IsDescendantOf(Players)) return false;
		if (!this.isInitialized || !this.isStartedReplication || this.isLocked) return false;

		this.components.removeComponent<PlayerComponent>(this.instance);
		return true;
	}

	private validateInitialized() {
		logAssert(this.isInitialized, "PlayerComponent must be initialized");
	}

	private initActions() {
		setmetatable(this.Actions, {
			__index:
				(_, key) =>
				(...args: unknown[]) => {
					if (!this.isInitialized) return;
					const action = this.producer[key as never] as Callback;
					action(...args);
				},
		});
	}

	private initProducer(playerData: PlayerData) {
		this.producer = playerProducer.clone();
		const producers: Record<keyof PlayerData, Producer> = {
			Save: createProducer(playerData.Save, this.producer.getActions() as never),
			Dynamic: createProducer(playerData.Dynamic, this.producer.getActions() as never),
		};

		this.broadcaster = createBroadcaster({
			producers: producers,
			dispatch: (player: Player, actions: BroadcastAction[]) => {
				Events.Dispatch.fire(player, actions);
			},

			beforeHydrate: (player, state) => {
				return {
					playerData: state,
				} as object;
			},
		});

		this.producer.subscribe((data) => {
			this.profile.Data = data.Save;
		});

		this.producer.setState(playerData);
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

	private releaseProfile() {
		this.profile.Data.LastUpdate = GetCurrentTime();
		this.profile.Data.IsNewProfile = false;
		this.profile.Release();
	}

	private onFailedLoadProfile() {
		// Here you can handle the fail
	}

	private initProfile() {
		return new Promise<PlayerSave>((resolve) => {
			this.playerService
				.LoadProfile(this.instance)
				.then((profile) => {
					this.profile = profile;
					resolve(profile.Data);
				})
				.catch(() => {
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

		this.releaseProfile();
		super.destroy();
		this.Janitor.Destroy();
	}
}
