/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Controller, Modding, OnInit } from "@flamework/core";
import { subscribe } from "@rbxts/charm";
import { client, SyncPayload } from "@rbxts/charm-sync";
import { Events } from "client/network";
import { InjectType } from "shared/decorators/field/Inject-type";
import { PlayerAtoms } from "shared/network";
import { GameDataSchema } from "shared/schemas/game-data";
import { GameAtom, GameData } from "shared/schemas/game-data-types";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { PlayerData } from "shared/schemas/player-data-types";
import { CreateAtom, WrappedAtom } from "shared/utilities/atom-utility";
import { GetCurrentThread } from "shared/utilities/function-utilities";
import { DeepCloneTable } from "shared/utilities/object-utilities";
import { ReflexDevToolsController } from "./reflex-devtools-controller";

export interface OnDataReplicated {
	OnDataReplicated(): void;
}

interface ClientPlayerData {
	playerData: PlayerData;
	gameData: GameData;
}

export type PlayerAtom = WrappedAtom<PlayerData>;

const gameAtom = CreateAtom(DeepCloneTable(GameDataSchema));
Modding.registerDependency<GameAtom>((ctor) => gameAtom);

const playerAtom = CreateAtom(DeepCloneTable(PlayerDataSchema));
Modding.registerDependency<PlayerAtom>((ctor) => playerAtom);

@Controller({
	loadOrder: -1,
})
export class PlayerController implements OnInit {
	private atoms = {
		playerData: playerAtom,
		gameData: gameAtom,
	} as unknown as PlayerAtoms;

	private syncer = client<PlayerAtoms>({
		atoms: this.atoms,
	});
	private isGotData = false;

	@InjectType
	private reflexDevTools!: ReflexDevToolsController;

	public onInit() {
		const listeners = new Set<OnDataReplicated>();
		Modding.onListenerAdded<OnDataReplicated>((obj) => listeners.add(obj));
		Modding.onListenerRemoved<OnDataReplicated>((obj) => listeners.delete(obj));

		this.expectData().then(() => {
			listeners.forEach((listener) => listener.OnDataReplicated());
		});
		this.StartReplication();
	}

	/**@metadata macro */
	public GetClass<T>(id?: Modding.Generic<T, "id">) {
		assert(id);
		return Modding.getObjectFromId(id) as T;
	}

	public GetPlayerAtom() {
		return this.atoms.playerData;
	}

	public GetData(): ClientPlayerData;
	public GetData<S>(selector: (state: ClientPlayerData) => S): S;
	public GetData(selector?: (state: ClientPlayerData) => unknown) {
		const data = {
			playerData: this.atoms.playerData(),
			gameData: this.atoms.gameData(),
		};

		return selector ? selector(data) : data;
	}

	public GetPlayerData(): PlayerData;
	public GetPlayerData<S>(selector: (state: PlayerData) => S): S;
	public GetPlayerData(selector?: (state: PlayerData) => unknown) {
		return selector ? selector(this.atoms.playerData()) : this.atoms.playerData();
	}

	public GetGameData(): GameData;
	public GetGameData<S>(selector: (state: GameData) => S): S;
	public GetGameData(selector?: (state: GameData) => unknown) {
		return selector ? selector(this.atoms.gameData()) : this.atoms.gameData();
	}

	public GetGameAtom() {
		return this.atoms.gameData;
	}

	public GetAtoms() {
		return this.atoms;
	}

	public Subscribe(listener: (state: ClientPlayerData, previousState: ClientPlayerData) => void): () => void;

	public Subscribe<T>(
		selector: (state: ClientPlayerData) => T,
		listener: (state: T, previousState: T) => void,
	): () => void;

	public Subscribe(...args: unknown[]) {
		if (args.size() === 1) {
			return subscribe(() => this.GetData(), args[0] as never);
		}

		const [selector, listener] = args as [
			(state: ClientPlayerData) => unknown,
			(state: unknown, previousState: unknown) => void,
		];
		return subscribe(() => selector(this.GetData()), listener as never);
	}

	public SubscribeToPlayerData(listener: (state: PlayerData, previousState: PlayerData) => void): () => void;

	public SubscribeToPlayerData<T>(
		selector: (state: PlayerData) => T,
		listener: (state: T, previousState: T) => void,
	): () => void;

	public SubscribeToPlayerData(...args: unknown[]) {
		if (args.size() === 1) {
			return subscribe(this.GetPlayerAtom(), args[0] as never);
		}

		const [selector, listener] = args as [
			(state: PlayerData) => unknown,
			(state: unknown, previousState: unknown) => void,
		];
		return subscribe(() => selector(this.GetPlayerAtom()()), listener as never);
	}

	private async expectData() {
		const thread = GetCurrentThread();

		Events.Dispatch.connect((payload) => {
			this.dispatch(payload as SyncPayload<PlayerAtoms>);

			if (!this.isGotData) {
				this.isGotData = true;
				thread.Resume();
			}
		});

		thread.Yield();
	}

	private dispatch(payload: SyncPayload<PlayerAtoms>) {
		this.syncer.sync(payload);

		payload.data.playerData &&
			this.reflexDevTools.DisplayData(`PlayerData-${payload.type}`, payload.data.playerData);
		payload.data.gameData && this.reflexDevTools.DisplayData(`GameData-${payload.type}`, payload.data.gameData);
	}

	private StartReplication() {
		Events.StartReplication.fire();
	}
}
