import { BaseComponent, Component, Components } from "@flamework/components";
import { Dependency, Flamework, Modding, OnStart, Reflect } from "@flamework/core";
import {
	OnDestroyModule,
	OnSendData,
	OnStartModule,
	PlayerModule,
	PlayerModules,
} from "shared/decorators/constructor/player-module-decorator";
import { DeepCloneTable, GetIdentifier } from "shared/utilities/object-utilities";

import { Constructor } from "@flamework/core/out/utility";
import { Atom, atom, Molecule, subscribe } from "@rbxts/charm";
import { server, ServerSyncer, SyncPayload } from "@rbxts/charm-sync";
import { None, produce } from "@rbxts/immut";
import { Draft } from "@rbxts/immut/src/types-external";
import { Janitor } from "@rbxts/janitor";
import { Document } from "@rbxts/lapis";
import Signal from "@rbxts/rbx-better-signal";
import { Players } from "@rbxts/services";
import { setInterval } from "@rbxts/set-timeout";
import { Events } from "server/network";
import { DataStoreWrapperService } from "server/services/data-store-service";
import { PlayerService } from "server/services/player-service";
import { IsTestMode } from "server/utility-for-tests/test-mode";
import { InjectType } from "shared/decorators/field/Inject-type";
import { IsCanUseObject } from "shared/flamework-utils";
import { PlayerAtoms } from "shared/network";
import { GetPlaceName } from "shared/places";
import { GameAtom } from "shared/schemas/game-data-types";
import { PlayerDataSchema, PlayerDataValidator } from "shared/schemas/player-data";
import { PlayerData, PlayerSave } from "shared/schemas/player-data-types";
import { DependenciesContainer } from "shared/utilities/dependencies-container";
import {
	CreateInstanceWithountCallingConstructor,
	GetCurrentTime,
	logAssert,
} from "shared/utilities/function-utilities";
import { ToPlayerInfo } from "shared/utilities/game-utility";
import RepairDataFromDraft from "shared/utilities/repair-data-from-draft";
import { DeepReadonly, Selector, VoidCallback } from "types/utility";

const HYDRATE_RATE = -1;
const KICK_IF_PROFILE_NOT_LOADED = true;
const KICK_MESSSAGE = "Failed to load data.\ndm support staff if problem repeats";

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

	Mutate: (
		recipe: (
			draft: Draft<PlayerData>,
			originalState: DeepReadonly<PlayerData>,
		) => typeof draft | void | undefined | (PlayerData extends undefined ? typeof None : never),
	) => boolean;
}

@Component({})
export class PlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	public readonly Name = this.instance.Name;
	public readonly UserId = this.instance.UserId;
	public readonly DisplayName = this.instance.DisplayName;

	@InjectType
	private dataStore!: DataStoreWrapperService;

	@InjectType
	private components!: Components;

	@InjectType
	private playerService!: PlayerService;

	@InjectType
	private gameAtom!: GameAtom;

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
	private isDestroying = false;
	private lockedModules = new Set<string>();
	private syncer!: ServerSyncer<PlayerAtoms, false>;
	private container = new DependenciesContainer(true);

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
		this.container.Register<PlayerComponent>(() => this);
		this.container.Register<DependenciesContainer>(() => this.container);

		this.playerService.AddPlayer(this);
		const playerData = DeepCloneTable(PlayerDataSchema);

		// Step 1: Initilize playerAtom
		this.initAtoms(playerData);

		// Step 2: Load profile data
		const [sucess, profileData] = this.initProfile().await();
		if (!sucess) return;

		const finalData = RepairDataFromDraft(
			profileData ? DeepCloneTable(profileData) : playerData.Save,
		) as DeepReadonly<PlayerSave>;
		finalData && this.setData({ Save: finalData, Dynamic: playerData.Dynamic }, false);

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

				Promise.try(() => {
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
		const success = this.setData(data);
		success && this.invokeOnSendDataEvent();

		return success;
	}

	public ToPlayerInfo() {
		return ToPlayerInfo(this);
	}

	public Keep() {
		this.isKeepMode = true;
	}

	public Release() {
		this.isKeepMode = false;

		if (!IsTestMode() && !this.instance.IsDescendantOf(Players)) {
			this.TryDestroy();
		}
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
				await this.saveProfile();
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
		assert(
			!this.lockedModules.has(moduleSpecifier),
			`Module ${moduleSpecifier} can't be used in place ${GetPlaceName()}`,
		);

		const module = this.modules.get(`${moduleSpecifier}`) as T;
		assert(module, `Module ${moduleSpecifier} not decorated`);

		return module as T;
	}

	public GetModules() {
		return this.modules as ReadonlyMap<string, object>;
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
		return selector === undefined ? this.atom() : selector(this.atom());
	}

	public Subscribe(listener: (state: PlayerData, previousState: PlayerData) => void): () => void;

	public Subscribe<T>(selector: (state: PlayerData) => T, listener: (state: T, previousState: T) => void): () => void;

	public Subscribe(...args: unknown[]) {
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
		if (this.isLocked) return;

		await this.saveProfile();
	}

	public TryDestroy() {
		if (this.isKeepMode) return false;
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
		this.container.Register<PlayerAtom>(() => this.playerAtom);
	}

	private saveBrokenData(data: {}) {
		if (this.IsStatus("Started")) return;
		this.dataStore
			.SaveBrokenData(this.UserId, data)
			.then(() => {
				warn(`[PlayerComponent] Saved broken data for ${this.UserId}`);
			})
			.catch(warn);
	}

	private setData(data: PlayerData, validate = true) {
		const newData = data;
		data = newData ?? data;

		if (!IsTestMode() && !PlayerDataValidator(data) && validate) {
			this.saveBrokenData(data.Save);
			warn(`[PlayerComponent] Invalid data provided: `, data);
			return false;
		}

		this.profile && this.profile!.write(data.Save);

		this.atom(data);
		return true;
	}

	/**
	 * DONT USE, ONLY FOR EDITING
	 * @internal
	 * @hidden
	 * */
	public SetData(data: PlayerData) {
		this.setData(data, false);
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
		if (IsTestMode()) return;
		this.syncer.hydrate(this.instance);
	}

	private doDispatch(payload: SyncPayload<PlayerAtoms, false>) {
		Events.Dispatch.fire(this.instance, payload);
	}

	private initSyncer() {
		if (IsTestMode()) return;

		this.syncer = server({
			atoms: {
				playerData: this.atom,
				gameData: this.gameAtom,
			},
		}) as never;

		this.janitor.Add(
			this.syncer.connect((player, payload) => {
				if (player !== this.instance) return;
				this.doDispatch(payload);
			}),
		);

		if (HYDRATE_RATE > 0) {
			this.janitor.Add(
				setInterval(() => {
					if (!this.IsStatus("Started")) return;
					this.hydrate();
				}, HYDRATE_RATE),
			);
		}
	}

	private invokeOnSendDataEvent() {
		const state = this.atom();
		const newData = produce(state, (draft) => {
			this.orderedModules.forEach(([module]) => {
				if (!Flamework.implements<OnSendData>(module)) return;

				try {
					module.OnSendData(draft as never, state);
				} catch (error) {
					warn(`[PlayerComponent: ${this.instance.Name}] ${error}`);
				}
			});
		});

		this.atom(newData);
	}

	private async releaseProfile() {
		if (!this.profile) return;

		const data = this.profile.read();
		this.profile.write({ ...data, LastUpdate: GetCurrentTime(), IsNewProfile: false });

		await this.profile.save();
	}

	private onFailedLoadProfile() {
		KICK_IF_PROFILE_NOT_LOADED && this.instance.Kick(KICK_MESSSAGE);

		// Here you can handle the fail
		print(`[PlayerComponent: ${this.instance.Name}] Failed to load profile`);
	}

	private initProfile() {
		return new Promise<PlayerSave | undefined>((resolve, reject) => {
			if (IsTestMode()) return resolve(undefined);

			this.dataStore
				.LoadProfile(this.instance)
				.then((profile) => {
					this.profile = profile;
					resolve(DeepCloneTable(profile.read()));
				})
				.catch((er: string) => {
					print(`[PlayerComponent: ${this.instance.Name}] ${er}`);
					this.onFailedLoadProfile();
					KICK_IF_PROFILE_NOT_LOADED ? reject() : resolve(undefined);
				});
		});
	}

	private createModule(obj: Constructor) {
		return CreateInstanceWithountCallingConstructor(obj);
	}

	private createPlayerAtom() {
		const janitor = this.janitor;
		const atom = this.atom;
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const context = this;

		const moduleAtom = {
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

			Mutate: (recipe: (state: Draft<PlayerData>, original: PlayerData) => PlayerData) => {
				if (this.isLocked) return false;
				const state = atom();
				const data = produce(state, (draft) => recipe(draft as never, state as never) as never);
				return context.setData(data);
			},
		} as unknown as PlayerAtom;
		const mt = {
			__call: (_, ...args: unknown[]) => {
				if (args.size() === 0) return atom();
				if (this.isLocked) return false;

				return context.setData(args[0] as never);
			},
		} as LuaMetatable<typeof moduleAtom>;

		return setmetatable(moduleAtom, mt);
	}

	private initModules() {
		const constructors = PlayerModules;
		const moduleConstructors = new Map<object, VoidCallback>();

		// Step 1 - Create Modules
		constructors.forEach((obj) => {
			const config = Reflect.getMetadata<Parameters<typeof PlayerModule>[0]>(obj, "playerModule:config")!;
			if (IsTestMode() && config.IsDisableInTestMode) return;
			if (!IsCanUseObject(GetIdentifier(obj))) {
				this.lockedModules.add(GetIdentifier(obj));
				return;
			}

			const [instance, constructor] = this.createModule(obj);
			this.modules.set(GetIdentifier(obj), instance);
			moduleConstructors.set(instance, constructor);
		});

		// Step 2 - Register Modules
		this.modules.forEach((module, id) => this.container.Register(() => module, id as never));

		// Step 3 - Inject Modules
		this.modules.forEach((module, id) =>
			this.container.Inject(module, (injecting) => {
				const id = GetIdentifier(injecting as object);
				assert(!this.lockedModules.has(id), `Module ${id} can't be used in place ${GetPlaceName()}`);
			}),
		);

		// Step 4 - Call constructors
		moduleConstructors.forEach((constructor) => {
			constructor();
		});

		this.modules.forEach((module) => {
			const loadOrder = Reflect.getMetadata<number>(module, "playerModule:loadOrder") ?? 1;
			this.orderedModules.push([module, loadOrder]);
		});

		this.orderedModules.sort(([Aobject, Aorder], [Bobject, Border]) => {
			return Aorder < Border;
		});
	}

	public destroy() {
		if (this.isDestroying) return;

		this.isDestroying = true;
		this.playerService.RemovePlayer(this);
		this.container.Clear();
		super.destroy();

		this.orderedModules.forEach(([module]) => {
			if (Flamework.implements<OnDestroyModule>(module)) {
				const [success, output] = pcall(() => module.OnDestroyModule());

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
