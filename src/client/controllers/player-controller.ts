import { Controller, OnInit, OnStart, Modding } from "@flamework/core";
import { Atom, atom, subscribe, sync, SyncPayload } from "@rbxts/charm";
import { SharedClasses } from "@rbxts/shared-classes-reflex";
import { Events } from "client/network";
import { DispatchSerializer, PlayerAtoms } from "shared/network";
import { Inject } from "shared/decorators/field/inject";
import { GameData, GameDataSchema } from "shared/schemas/game-data";
import { GetCurrentThread } from "shared/utilities/function-utilities";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { DeepCloneTable } from "shared/utilities/object-utilities";
import { PlayerData } from "shared/schemas/player-data-types";
import { ReflexDevToolsController } from "./reflex-devtools-controller";

export interface OnDataReplicated {
	OnDataReplicated(): void;
}

interface ClientPlayerData {
	playerData: PlayerData;
	gameData: GameData;
}

@Controller({
	loadOrder: 0,
})
export class PlayerController implements OnInit, OnStart {
	private atoms: PlayerAtoms = {
		playerData: atom(DeepCloneTable(PlayerDataSchema)),
		gameData: atom(DeepCloneTable(GameDataSchema)),
	};
	private syncer = sync.client<PlayerAtoms>({
		atoms: this.atoms,
	});
	private isGotData = false;

	@Inject
	private reflexDevTools!: ReflexDevToolsController;

	onInit() {
		const listeners = new Set<OnDataReplicated>();
		Modding.onListenerAdded<OnDataReplicated>((obj) => listeners.add(obj));
		Modding.onListenerRemoved<OnDataReplicated>((obj) => listeners.delete(obj));

		this.StartReplication();
		this.expectData().then(() => {
			listeners.forEach((listener) => listener.OnDataReplicated());
		});
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

		Events.Dispatch.connect((payloadBuffer) => {
			this.dispatch(payloadBuffer);

			if (!this.isGotData) {
				this.isGotData = true;
				thread.Resume();
			}
		});

		thread.Yield();
	}

	private dispatch(payloadBuffer: { buffer: buffer; blobs: defined[] }) {
		const payload = DispatchSerializer.deserialize(payloadBuffer.buffer, payloadBuffer.blobs) as SyncPayload<
			{
				[K in keyof PlayerAtoms]: PlayerAtoms[K] extends Atom<infer R> ? R : never;
			}
		>;

		this.syncer.sync(payload as never);

		payload.data.playerData &&
			this.reflexDevTools.DisplayData(`PlayerData-${payload.type}`, this.atoms.playerData());
		payload.data.gameData && this.reflexDevTools.DisplayData(`GameData-${payload.type}`, this.atoms.gameData());
	}

	private StartReplication() {
		Events.StartReplication.fire();
	}

	public onStart() {
		SharedClasses.StartClient();
	}
}
