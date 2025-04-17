import { GlobalSettings } from "shared/game-data/global-settings";
import { LuaConfigs } from "./configs";

export interface DataStructure {
	GlobalSettings: GlobalSettings;
	Configs: { [K in keyof LuaConfigs]: LuaConfigs[K][] };
}
