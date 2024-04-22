export interface PlayerSave {
	LastUpdate: number;
}

type DynamicId = string;

export interface PlayerDynamicData {}

export interface PlayerData {
	Dynamic: PlayerDynamicData;
	Save: PlayerSave;
}