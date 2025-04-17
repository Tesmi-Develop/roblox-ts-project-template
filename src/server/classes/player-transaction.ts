import { ITransactEntity, Transaction } from "@rbxts/transact";
import { IPlayerInteraction, PlayerComponent } from "server/components/player-component";
import { logAssert } from "shared/utilities/function-utilities";

const COUNT_REPEATS = 5;

export class PlayerTransaction implements ITransactEntity {
	private static players = new Set<PlayerComponent>();
	private playerInteraction?: IPlayerInteraction;

	public static Create(players: { playerComponent: PlayerComponent; onTransact: () => void }[]) {
		return new Transaction(
			players.map(({ playerComponent, onTransact }) => new PlayerTransaction(playerComponent, onTransact)),
			{
				TransactionRepeats: 1,
				RollbackRepeats: 1,
			},
		);
	}

	constructor(
		private playerComponent: PlayerComponent,
		private onTransact: () => void,
	) {}

	public Init() {
		assert(!PlayerTransaction.players.has(this.playerComponent), "Player already in transaction");
		assert(!this.playerComponent.GetLocked(), "Player is locked");

		PlayerTransaction.players.add(this.playerComponent);
		this.playerComponent.DoCommit();
		this.playerComponent.Keep();
	}

	public async Transact() {
		const [success] = pcall(() => this.onTransact());
		logAssert(success, "[PlayerTransaction]: onTransact failed");
		this.playerInteraction = this.playerComponent.LockComponent();

		return {
			repeats: COUNT_REPEATS,
			callback: () => this.playerInteraction!.SaveProfile(),
		};
	}

	public async Rollback() {
		this.playerComponent.RollbackToLastCommit();

		return (
			this.playerInteraction && {
				repeats: COUNT_REPEATS,
				callback: () => this.playerInteraction!.SaveProfile(),
			}
		);
	}

	public End() {
		this.playerInteraction?.UnlockComponent();
		this.playerComponent.Release();
		PlayerTransaction.players.delete(this.playerComponent);
	}
}
