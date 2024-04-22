import { PlayerComponent } from "server/components/player-component";
import {
	PlayerModuleDecorator,
	OnSendData,
	OnStartModule,
	OnStopModule,
} from "shared/decorators/constructor/player-module-decorator";
import { PlayerSave, PlayerDynamicData } from "types/player/player-data";

@PlayerModuleDecorator()
export class TestModule implements OnSendData, OnStartModule, OnStopModule {
	private playerComponent: PlayerComponent;

	public constructor(playerComponent: PlayerComponent) {
		this.playerComponent = playerComponent;
	}

	public OnSendData(saveData: PlayerSave, dynamicData: PlayerDynamicData) {
		print("TestModule: OnSendData", saveData, dynamicData);
	}

	public OnStartModule() {
		print("TestModule: OnStartModule");
	}

	public OnStopModule() {
		print("TestModule: OnStopModule");
	}
}
