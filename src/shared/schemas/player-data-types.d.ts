import { Roles } from "shared/enums/roles";
import { DeepReadonly } from "types/utility";

export interface playerData {
	Save: {
		LastUpdate: number;
		IsNewProfile: boolean;
		Role: keyof typeof Roles;
	};
	Dynamic: {};
}

export type PlayerData = DeepReadonly<playerData>;
export type PlayerSave = PlayerData["Save"];
export type PlayerDynamicData = PlayerData["Dynamic"];
