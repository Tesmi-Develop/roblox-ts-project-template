import { Draft } from "@rbxts/immut/src/types-external";
import { Logger } from "@rbxts/log";
import { PlayerAtom } from "server/components/player-component";
import {
	OnDestroyModule,
	OnSendData,
	OnStartModule,
	PlayerModule,
} from "shared/decorators/constructor/player-module-decorator";
import { InjectType } from "shared/decorators/field/Inject-type";
import { playerData, PlayerData } from "shared/schemas/player-data-types";

@PlayerModule()
export class TestModule implements OnSendData, OnStartModule, OnDestroyModule {
	@InjectType
	private logger!: Logger;

	@InjectType
	private atom!: PlayerAtom;

	public OnSendData(data: Draft<playerData>, original: PlayerData) {
		this.logger.Debug("TestModule: OnSendData", data, original);
	}

	public OnStartModule() {}

	public OnDestroyModule() {
		this.logger.Debug("TestModule: OnStopModule");
	}
}
