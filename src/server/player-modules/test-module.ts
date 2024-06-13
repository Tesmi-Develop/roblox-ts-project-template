import { PlayerTransaction } from "server/classes/player-transaction";
import { PlayerComponent } from "server/components/player-component";
import { InjectAtom } from "server/components/player-component/inject-atom";
import {
	PlayerModuleDecorator,
	OnSendData,
	OnStartModule,
	OnStopModule,
} from "shared/decorators/constructor/player-module-decorator";
import { InjectType } from "shared/decorators/field/Inject-player-module";
import { PlayerDynamicData, PlayerSave } from "shared/schemas/player-data-types";
import { MutateAtom } from "shared/utilities/function-utilities";

@PlayerModuleDecorator()
export class TestModule implements OnSendData, OnStartModule, OnStopModule {
	@InjectType
	private playerComponent!: PlayerComponent;

	private atom = InjectAtom("Save.Statistics");

	public OnSendData(saveData: PlayerSave, dynamicData: PlayerDynamicData) {
		print("TestModule: OnSendData", saveData, dynamicData);
	}

	public Increment(amount: number) {
		return MutateAtom(this.atom, (draft) => {
			draft.Save.Statistics.Money += amount;
		});
	}

	public OnStartModule() {
		print(this.atom());

		this.playerComponent.Subscribe((state) => {
			print(state);
		});

		this.Increment(5);

		PlayerTransaction.Create<[TestModule]>([
			{
				playerComponent: this.playerComponent,
				onTransact: async () => {
					task.wait(5);
					print(this.Increment(15));
					print("Completed transaction");
				},
			},
		]).Transact();

		print("TestModule: OnStartModule", this.playerComponent);
	}

	public OnStopModule() {
		print("TestModule: OnStopModule");
	}
}
