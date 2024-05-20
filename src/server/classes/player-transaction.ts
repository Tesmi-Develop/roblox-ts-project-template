import { ITransactEntity, Transaction } from "@rbxts/transact";
import { IPlayerInteraction, PlayerComponent, PlayerDispatchers } from "server/components/player-component";
import { PlayerData } from "types/player/player-data";

export class PlayerTransaction implements ITransactEntity {
	private playerInteraction!: IPlayerInteraction;
	private originalData!: PlayerData;

	public static Create(
		players: { playerComponent: PlayerComponent; onTransact: (actions: PlayerDispatchers) => Promise<void> }[],
	) {
		return new Transaction(
			players.map(({ playerComponent, onTransact }) => new PlayerTransaction(playerComponent, onTransact)),
		);
	}

	constructor(
		private playerComponent: PlayerComponent,
		private onTransact: (actions: PlayerDispatchers) => Promise<void>,
	) {}

	public Init() {
		assert(!this.playerComponent.GetLocked(), "Player is locked");
		this.originalData = this.playerComponent.GetData().PlayerData;
		this.playerInteraction = this.playerComponent.LockComponent();
		this.playerComponent.Keep();
	}

	public async Transact() {
		await this.onTransact(this.playerInteraction!.Actions);
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
