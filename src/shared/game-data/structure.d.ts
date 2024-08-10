import { LuaConfigs } from "shared/game-data/configs";
import { GlobalSettings } from "types/global-settings";

export interface DataStructure {
	GlobalSettings: GlobalSettings;
	Configs: { [K in keyof LuaConfigs]: LuaConfigs[K][] };
}
