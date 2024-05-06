import { PlayerComponent } from "server/components/player-component";
import {
	PlayerModuleDecorator,
	OnSendData,
	OnStartModule,
	OnStopModule,
} from "shared/decorators/constructor/player-module-decorator";
import { InjectPlayer } from "shared/decorators/field/Inject-player";
import { PlayerSave, PlayerDynamicData } from "types/player/player-data";

@PlayerModuleDecorator()
export class TestModule implements OnSendData, OnStartModule, OnStopModule {
	@InjectPlayer
	private playerComponent!: PlayerComponent;

	public OnSendData(saveData: PlayerSave, dynamicData: PlayerDynamicData) {
		print("TestModule: OnSendData", saveData, dynamicData);
	}

	public OnStartModule() {
		print("TestModule: OnStartModule", this.playerComponent);
	}

	public OnStopModule() {
		print("TestModule: OnStopModule");
	}
}
