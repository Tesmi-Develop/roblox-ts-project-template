import { Controller, OnInit, OnStart, Modding } from "@flamework/core";
import { Atom, atom, sync, SyncPayload } from "@rbxts/charm";
import { SharedClasses } from "@rbxts/shared-classes-reflex";
import { Events } from "client/network";
import { DispatchSerializer, SyncerType } from "shared/network";
import { ReflexDevToolController } from "./reflex-devtool-controller";
import { Inject } from "shared/decorators/field/inject";
import { GameData, GameDataSchema } from "shared/schemas/game-data";
import { GetCurrentThread } from "shared/utilities/function-utilities";
import { PlayerData } from "shared/schemas/player-data-types";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { DeepCloneTable } from "shared/utilities/object-utilities";
import { DeepWritable } from "types/utility";

export interface OnDataReplicated {
	OnDataReplicated(): void;
}

export interface PlayerAtoms {
	playerData: Atom<PlayerData>;
	gameData: Atom<GameData>;
}

@Controller({
	loadOrder: 0,
})
export class PlayerController implements OnInit, OnStart {
	private atoms: SyncerType = {
		playerData: atom<PlayerData>(DeepCloneTable(PlayerDataSchema)),
		gameData: atom<GameData>(DeepCloneTable(GameDataSchema)),
	};
	private syncer = sync.client<SyncerType>({
		atoms: this.atoms,
	});
	private isGotData = false;

	@Inject
	private reflexDevTools!: ReflexDevToolController;

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

	public GetGameAtom() {
		return this.atoms.gameData;
	}

	public GetAtoms() {
		return this.atoms;
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
				[K in keyof SyncerType]: SyncerType[K] extends Atom<infer R> ? R : never;
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
