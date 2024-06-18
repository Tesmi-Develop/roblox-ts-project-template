import { PlayerTransaction } from "server/classes/player-transaction";
import { PlayerAtom, PlayerComponent } from "server/components/player-component";
import {
	PlayerModuleDecorator,
	OnSendData,
	OnStartModule,
	OnStopModule,
} from "shared/decorators/constructor/player-module-decorator";
import { InjectType } from "shared/decorators/field/Inject-type";
import { PlayerDynamicData, PlayerSave } from "shared/schemas/player-data-types";
import { MutateAtom } from "shared/utilities/function-utilities";

@PlayerModuleDecorator()
export class TestModule implements OnSendData, OnStartModule, OnStopModule {
	@InjectType
	private playerComponent!: PlayerComponent;

	@InjectType
	private atom!: PlayerAtom;

	public OnSendData(saveData: PlayerSave, dynamicData: PlayerDynamicData) {
		print("TestModule: OnSendData", saveData, dynamicData);
	}

	public Increment(amount: number) {
		return MutateAtom(this.atom, (draft) => {
			draft.Save.Statistics.Money += amount;
		});
	}

	public OnStartModule() {
		this.playerComponent.Subscribe((state) => {
			print(state);
		});

		this.Increment(5);

		PlayerTransaction.Create([
			{
				playerComponent: this.playerComponent,
				onTransact: () => {
					task.wait(5);
					print(this.Increment(15));
				},
			},
		]).Transact();

		print("TestModule: OnStartModule", this.playerComponent);
	}

	public OnStopModule() {
		print("TestModule: OnStopModule");
	}
}
