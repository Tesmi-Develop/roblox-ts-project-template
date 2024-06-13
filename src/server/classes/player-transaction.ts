import { Modding } from "@flamework/core";
import { ITransactEntity, Transaction } from "@rbxts/transact";
import { IPlayerInteraction, PlayerComponent } from "server/components/player-component";
import { PlayerData } from "shared/schemas/player-data-types";

export class PlayerTransaction implements ITransactEntity {
	private playerInteraction!: IPlayerInteraction;
	private originalData!: PlayerData;

	/** @metadata macro */
	public static Create<T extends object[]>(
		players: { playerComponent: PlayerComponent; onTransact: () => Promise<void> }[],
		modules?: Modding.Many<{ [k in keyof T]: Modding.Generic<T[k], "id"> }>,
	) {
		return new Transaction(
			players.map(
				({ playerComponent, onTransact }) => new PlayerTransaction(playerComponent, onTransact, modules ?? []),
			),
		);
	}

	constructor(
		private playerComponent: PlayerComponent,
		private onTransact: () => Promise<void>,
		private allowenedModules: string[],
	) {}

	public Init() {
		assert(!this.playerComponent.GetLocked(), "Player is locked");
		this.originalData = this.playerComponent.GetData();
		this.playerInteraction = this.playerComponent.LockComponent(this.allowenedModules);
		this.playerComponent.Keep();
	}

	public async Transact() {
		await this.onTransact();
		await this.playerInteraction.SaveProfile();
	}

	public async Rollback() {
		this.playerInteraction.SetData(this.originalData);
		await this.playerInteraction.SaveProfile();
	}

	public End() {
		this.playerInteraction.UnlockComponent();
		this.playerComponent.Release();
	}
}
