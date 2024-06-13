import { Dependency, Flamework, Modding, OnStart, Reflect } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import {
	OnStartModule,
	OnSendData,
	PlayerModules,
	OnStopModule,
} from "shared/decorators/constructor/player-module-decorator";
import { DeepCloneTable, GetIdentifier } from "shared/utilities/object-utilities";
import { Selector } from "@rbxts/reflex";
import { Inject } from "shared/decorators/field/inject";
import { VoidCallback } from "types/utility";
import { Janitor } from "@rbxts/janitor";
import Signal from "@rbxts/rbx-better-signal";
import {
	CreateInstanceWithountCallingConstructor,
	GetCurrentTime,
	logAssert,
} from "shared/utilities/function-utilities";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { t } from "@rbxts/t";
import { Events } from "server/network";
import { Players } from "@rbxts/services";
import { Constructor } from "@flamework/core/out/utility";
import { Document } from "@rbxts/lapis";
import { DataStoreWrapperService } from "server/services/data-store-service";
import { ClearInjectAtomContext, GetInjectAtomContext, INJECT_ATOM_KEY, PlayerModuleAtom } from "./inject-atom";
import { Atom, atom, ServerSyncer, subscribe, sync } from "@rbxts/charm";
import { setInterval } from "@rbxts/set-timeout";
import { DispatchSerializer, SyncerType } from "shared/network";
import { getIdFromSpecifier } from "@flamework/components/out/utility";
import { GameDataService } from "server/services/game-data-service";
import { INJECT_TYPE_KEY } from "shared/decorators/field/Inject-player-module";
import { PlayerData, PlayerSave } from "shared/schemas/player-data-types";

const HYDRATE_RATE = -1;
const KICK_IF_PROFILE_NOT_LOADED = false;
const KICK_MESSSAGE = "Profile not loaded";

type Status = "Initializing" | "WaitForStarting" | "Started" | "Destroyed";

export interface IPlayerInteraction {
	SaveProfile: () => Promise<void>;
	SetData: (data: PlayerData) => void;
	UnlockComponent: () => void;
}

@Component({})
export class PlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	public readonly Name = this.instance.Name;
	public readonly UserId = this.instance.UserId;

	@Inject
	private dataStore!: DataStoreWrapperService;

	@Inject
	private components!: Components;

	@Inject
	private gameDataService!: GameDataService;

	private readonly janitor = new Janitor();
	private destroyConnections: (() => void)[] = [];
	private modules = new Map<string, object>();
	private orderedModules: [object, number][] = [];
	private status: Status = "Initializing";
	private statusSignals = new Map<Status, Signal<() => void>>();
	private atom!: Atom<PlayerData>;
	private syncer!: ServerSyncer<SyncerType>;
	private profile?: Document<PlayerSave>;
	private isKeepMode = false;
	private isLocked = false;
	private allowedModules?: Set<string>;
	private usedTopics = new Map<string, object>();
	private moduleStatus = new Map<object, boolean>();

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
		const [sucess, profileData] = this.initProfile().await();
		if (!sucess) return;

		const playerData = { Save: profileData, Dynamic: dynamicData };

		// Step 3: Invoke onSendData
		this.invokeOnSendDataEvent(playerData);

		// Step 4: Initialize syncer
		this.initSyncer(playerData);

		// Step 5: Ready to start
		this.setStatus("WaitForStarting");

		// Step 5: Invoke onStartModule
		this.WaitForStatus("Started").then(() => {
			this.orderedModules.forEach(([module]) => {
				if (!Flamework.implements<OnStartModule>(module)) return;
				if (!this.moduleStatus.get(module)) return;

				task.spawn(() => {
					try {
						module.OnStartModule();
					} catch (error) {
						warn(`[PlayerComponent: ${this.instance.Name}] ${error}`);
					}
				});
			});
		});
	}

	public ResetData() {
		const data = DeepCloneTable(PlayerDataSchema);
		this.invokeOnSendDataEvent(data);

		this.atom(data);
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

	public LockComponent(allowenedModules: string[] = []): IPlayerInteraction {
		assert(!this.isLocked, "Component is already locked");
		this.isLocked = true;
		this.allowedModules = new Set(allowenedModules);

		return {
			SaveProfile: () => this.saveProfile(),
			SetData: (data: PlayerData) => this.setData(data),
			UnlockComponent: () => {
				this.isLocked = false;
				this.allowedModules = undefined;
			},
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

	public GetData(): PlayerData;
	public GetData<S>(selector: Selector<PlayerData, S>): S;

	public GetData(selector?: Selector<PlayerData, unknown>) {
		this.validateInitialized();

		return selector === undefined ? this.atom() : this.atom(selector as never);
	}

	public Subscribe(listener: (state: PlayerData, previousState: PlayerData) => void): () => void;

	public Subscribe<T>(selector: (state: PlayerData) => T, listener: (state: T, previousState: T) => void): () => void;

	public Subscribe(...args: unknown[]) {
		this.validateInitialized();

		if (args.size() === 1) {
			return subscribe(this.atom, args[0] as never);
		}

		const [selector, listener] = args as [
			(state: PlayerData) => unknown,
			(state: unknown, previousState: unknown) => void,
		];
		return subscribe(() => selector(this.atom()), listener as never);
	}

	public StartReplication() {
		if (!this.IsStatus("WaitForStarting")) return;

		this.syncer.hydrate(this.instance);
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

	public TryDestroy() {
		if (this.instance.IsDescendantOf(Players) || !this.IsStatus("Started") || this.isKeepMode) return false;
		this.components.removeComponent<PlayerComponent>(this.instance);

		return true;
	}

	private saveProfile() {
		if (!this.profile) return new Promise<void>((resolve) => resolve(undefined));
		return this.profile?.save();
	}

	private setData(data: PlayerData) {
		const [success] = pcall(() => this.profile?.write(data.Save));
		if (!success) return false;

		this.atom(data);
		return true;
	}

	private setStatus(status: Status) {
		this.status = status;
		this.statusSignals.get(status)?.Fire();
		this.statusSignals.get(status)?.Destroy();
		this.statusSignals.delete(status);
	}

	private validateInitialized() {
		logAssert(!this.IsStatus("Initializing"), "PlayerComponent must be initialized");
	}

	private initSyncer(playerData: PlayerData) {
		this.atom = atom(playerData);

		this.syncer = sync.server({ atoms: { playerData: this.atom, gameData: this.gameDataService.GetAtom() } });

		if (HYDRATE_RATE > 0) {
			this.janitor.Add(
				setInterval(() => {
					if (!this.IsStatus("Started")) return;
					this.syncer.hydrate(this.instance);
				}, HYDRATE_RATE),
			);
		}

		this.janitor.Add(
			this.syncer.connect((player, payload) => {
				if (player !== this.instance) return;
				Events.Dispatch.fire(player, DispatchSerializer.serialize(payload as never));
			}),
		);

		print("Atoms initialized");
		this.atom(playerData);
	}

	private invokeOnSendDataEvent(data: PlayerData) {
		this.orderedModules.forEach(([module]) => {
			if (!Flamework.implements<OnSendData>(module)) return;
			if (!this.moduleStatus.get(module)) return;

			try {
				module.OnSendData(data.Save, data.Dynamic);
			} catch (error) {
				warn(`[PlayerComponent: ${this.instance.Name}] ${error}`);
			}
		});
	}

	private async releaseProfile() {
		if (!this.profile) return;

		const data = this.profile.read();
		this.profile.write({ ...data, LastUpdate: GetCurrentTime(), IsNewProfile: false });
		await this.profile.close();
	}

	private onFailedLoadProfile() {
		KICK_IF_PROFILE_NOT_LOADED && this.instance.Kick(KICK_MESSSAGE);

		// Here you can handle the fail
		print(`[PlayerComponent: ${this.instance.Name}] Failed to load profile`);
	}

	private initProfile() {
		return new Promise<PlayerSave>((resolve, reject) => {
			this.dataStore
				.LoadProfile(this.instance)
				.then((profile) => {
					this.profile = profile;
					resolve(DeepCloneTable(profile.read()));
				})
				.catch((er: string) => {
					print(`[PlayerComponent: ${this.instance.Name}] ${er}`);
					this.onFailedLoadProfile();
					KICK_IF_PROFILE_NOT_LOADED ? reject() : resolve(DeepCloneTable(PlayerDataSchema.Save));
				});
		});
	}

	private createModule(obj: Constructor) {
		return CreateInstanceWithountCallingConstructor(obj);
	}

	private injectDepepedenciesInModule(instance: object) {
		const injectTypes = Reflect.getMetadata(instance, INJECT_TYPE_KEY);

		if (t.map(t.string, t.string)(injectTypes)) {
			injectTypes.forEach((moduleSpecifier, property) => {
				if (moduleSpecifier === Flamework.id<PlayerComponent>()) {
					instance[property as never] = this as never;
					return;
				}
				instance[property as never] = this.GetModule(moduleSpecifier as never);
			});
		}
	}

	private mergeStates(state: PlayerData, slice: Partial<PlayerData>) {
		const newState = { ...state };

		for (const [key, value] of pairs(slice)) {
			newState[key] = { ...state[key], ...value } as never;
		}

		return newState;
	}

	private createPlayerModuleAtom(atom: Atom<{}>, module: Constructor) {
		const moduleSpecifier = getIdFromSpecifier(module)!;

		return ((...args: unknown[]) => {
			if (args.size() === 0) return atom();
			if (this.isLocked && !this.allowedModules!.has(moduleSpecifier)) return false;

			const newState = this.mergeStates(this.GetData(), args[0] as never);
			atom(args[0] as never);

			return this.setData(newState);
		}) as PlayerModuleAtom<unknown>;
	}

	private createAtom(instance: object) {
		const keys = GetInjectAtomContext();
		if (!keys) return true;
		let flag = true;

		keys.forEach((key) => {
			if (!flag) return;

			if (this.usedTopics.has(key)) {
				const originalInstance = this.usedTopics.get(key)!;
				warn(
					`[PlayerComponent] Player modules [${getmetatable(instance)}, ${getmetatable(
						originalInstance,
					)}] refer to the same part of the date: "${key}".`,
				);
				flag = false;
				return;
			}
			this.usedTopics.set(key, instance);
		});

		if (!flag) {
			ClearInjectAtomContext();
			return false;
		}
		const newAtom = atom({});

		this.WaitForStatus("WaitForStarting").then(() => {
			const currentData = this.GetData();
			const state = {};

			keys.forEach((strkKey) => {
				const [key, property] = strkKey.split(".");
				const data = currentData[key as never] as object;
				const topic = data[property as never];

				state[key as never] = {
					[property as never]: typeIs(topic, "table") ? DeepCloneTable(topic) : topic,
				} as never;
			});

			newAtom(state);
		});

		for (const [key] of pairs(instance)) {
			if (instance[key as never] !== INJECT_ATOM_KEY) continue;
			instance[key as never] = this.createPlayerModuleAtom(
				newAtom,
				getmetatable(instance) as Constructor,
			) as never;
		}

		ClearInjectAtomContext();

		return true;
	}

	private initModules() {
		const constructors = PlayerModules;
		const moduleConstructors = new Map<object, VoidCallback>();

		// Step 1 - Create Modules
		constructors.forEach((obj) => {
			const [instance, constructor] = this.createModule(obj);
			this.modules.set(GetIdentifier(obj), instance);
			moduleConstructors.set(instance, constructor);
		});

		// Step 2 - Inject dependencies
		this.modules.forEach((module) => this.injectDepepedenciesInModule(module));

		// Step 3 - Call constructors
		moduleConstructors.forEach((constructor, instance) => {
			constructor();
			const success = this.createAtom(instance);
			this.moduleStatus.set(instance, success);
		});

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
		this.janitor.Destroy();
		this.setStatus("Destroyed");
	}
}
