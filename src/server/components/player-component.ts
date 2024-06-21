import { Dependency, Flamework, Modding, OnStart, Reflect } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import {
	OnStartModule,
	OnSendData,
	PlayerModules,
	OnStopModule,
} from "shared/decorators/constructor/player-module-decorator";
import { DeepCloneTable, GetIdentifier } from "shared/utilities/object-utilities";
import { Inject } from "shared/decorators/field/inject";
import { Selector, VoidCallback } from "types/utility";
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
import { Atom, atom, Molecule, ServerSyncer, subscribe, sync } from "@rbxts/charm";
import { setInterval } from "@rbxts/set-timeout";
import { DispatchSerializer, SyncerType } from "shared/network";
import { GameDataService } from "server/services/game-data-service";
import { PlayerData, PlayerSave } from "shared/schemas/player-data-types";
import { INJECT_TYPE_KEY } from "shared/decorators/field/Inject-type";
import { produce } from "@rbxts/immut";
import { PlayerService } from "server/services/player-service";

const HYDRATE_RATE = -1;
const KICK_IF_PROFILE_NOT_LOADED = false;
const KICK_MESSSAGE = "Profile not loaded";

type Status = "Initializing" | "WaitForStarting" | "Started" | "Destroyed";

export interface IPlayerInteraction {
	SaveProfile: () => Promise<void>;
	UnlockComponent: () => void;
}

export interface PlayerAtom extends Molecule<PlayerData> {
	(state: PlayerData | ((prev: PlayerData) => PlayerData)): boolean;

	Subscribe(callback: (state: PlayerData) => void): () => void;
	Subscribe<Selector>(
		selector: (state: PlayerData) => Selector,
		callback: (state: Selector, previousState: Selector) => void,
	): () => void;
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
	private playerService!: PlayerService;

	private readonly janitor = new Janitor();
	private destroyConnections: (() => void)[] = [];
	private modules = new Map<string, object>();
	private orderedModules: [object, number][] = [];
	private status: Status = "Initializing";
	private statusSignals = new Map<Status, Signal<() => void>>();
	private atom!: Atom<PlayerData>;
	private playerAtom!: PlayerAtom;
	private profile?: Document<PlayerSave>;
	private isKeepMode = false;
	private isLocked = false;
	private lastCommittedData?: PlayerData;

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

		// Step 1: Load profile data
		const [sucess, profileData] = this.initProfile().await();
		if (!sucess) return;

		// Step 2: Initilize playerAtom
		this.initAtoms({ Save: profileData, Dynamic: dynamicData });

		// Step 3: Initilize all modules
		this.initModules();

		// Step 4: Invoke onSendData
		this.invokeOnSendDataEvent();

		// Step 5: Initialize syncer
		this.initSyncer();

		// Step 6: Ready to start
		this.setStatus("WaitForStarting");

		// Step 7: Invoke onStartModule
		this.WaitForStatus("Started").then(() => {
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
		});
	}

	public ResetData() {
		const data = DeepCloneTable(PlayerDataSchema);
		this.atom(data);
		this.invokeOnSendDataEvent();
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

		const interaction = {
			isDestroyed: false,
			SaveProfile: async () => {
				assert(!interaction.isDestroyed, "Interaction is destroyed");
				return await this.SaveProfile();
			},
			UnlockComponent: () => {
				this.isLocked = false;
				interaction.isDestroyed = true;
			},
		};

		return interaction;
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

		this.hydrate();
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
		this.validateInitialized();
		return await this.saveProfile();
	}

	public TryDestroy() {
		if (this.instance.IsDescendantOf(Players) || !this.IsStatus("Started") || this.isKeepMode) return false;
		this.components.removeComponent<PlayerComponent>(this.instance);

		return true;
	}

	public DoCommit() {
		if (!this.IsStatus("Started")) return false;
		this.lastCommittedData = this.atom();

		return true;
	}

	public RollbackToLastCommit() {
		if (!this.IsStatus("Started")) return false;
		return (this.lastCommittedData && this.setData(this.lastCommittedData)) ?? false;
	}

	private saveProfile() {
		if (!this.profile) return new Promise<void>((resolve) => resolve(undefined));
		return this.profile?.save();
	}

	private initAtoms(playerData: PlayerData) {
		this.atom = atom(playerData);
		this.playerAtom = this.createPlayerAtom();
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

	private hydrate() {
		this.doDispatch(this.playerService.GenerateHydratePayload(this.atom) as never);
	}

	private doDispatch(payload: { type: "init" | "patch"; data: Record<keyof SyncerType, unknown> }) {
		Events.Dispatch.fire(this.instance, DispatchSerializer.serialize(payload));
	}

	private initSyncer() {
		if (HYDRATE_RATE > 0) {
			this.janitor.Add(
				setInterval(() => {
					if (!this.IsStatus("Started")) return;
					this.hydrate();
				}, HYDRATE_RATE),
			);
		}

		this.janitor.Add(
			this.playerService.ConnectPlayerSync(this.atom, (payload) => {
				this.doDispatch(payload);
			}),
		);
	}

	private invokeOnSendDataEvent() {
		this.atom(
			produce(this.atom(), (draft) => {
				this.orderedModules.forEach(([module]) => {
					if (!Flamework.implements<OnSendData>(module)) return;

					try {
						module.OnSendData(draft.Save, draft.Dynamic);
					} catch (error) {
						warn(`[PlayerComponent: ${this.instance.Name}] ${error}`);
					}
				});
			}),
		);
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

				if (moduleSpecifier === Flamework.id<PlayerAtom>()) {
					instance[property as never] = this.playerAtom as never;
					return;
				}

				instance[property as never] = this.GetModule(moduleSpecifier as never);
			});
		}
	}

	private createPlayerAtom() {
		const janitor = this.janitor;
		const atom = this.atom;

		const moduleAtom = {} as PlayerAtom;
		const mt = {
			__call: (_, ...args: unknown[]) => {
				if (args.size() === 0) return atom();
				if (this.isLocked) return false;

				atom(args[0] as never);
				return true;
			},

			Subscribe: function (this, ...args: unknown[]) {
				if (args.size() === 1) {
					return subscribe(atom, args[0] as never);
				}

				const [selector, listener] = args as [
					(state: unknown) => unknown,
					(state: unknown, previousState: unknown) => void,
				];
				const cleanup = subscribe(() => selector(atom()), listener as never);
				janitor.Add(cleanup);

				return cleanup;
			},
		} as LuaMetatable<typeof moduleAtom>;

		return setmetatable(moduleAtom, mt);
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
		super.destroy();

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
		this.janitor.Destroy();
		this.setStatus("Destroyed");
	}
}
