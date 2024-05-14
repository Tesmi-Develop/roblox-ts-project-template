export interface PlayerSave {
	LastUpdate: number;
	IsNewProfile: boolean;
}

type DynamicId = string;

export interface PlayerDynamicData {}

export interface PlayerData {
	Dynamic: PlayerDynamicData;
	Save: PlayerSave;
}
