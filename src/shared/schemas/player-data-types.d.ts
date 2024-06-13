import { PlayerDataSchema } from "./player-data";

export type PlayerData = typeof PlayerDataSchema;
export type PlayerSave = PlayerData["Save"];
export type PlayerDynamicData = PlayerData["Dynamic"];

type keyofPlayerDataSlices = {
	[K in keyof PlayerData["Save"] | keyof PlayerData["Dynamic"]]: K extends keyof PlayerData["Save"]
		? `Save.${K}`
		: K extends keyof PlayerData["Dynamic"]
		? `Dynamic.${K}`
		: never;
}[keyof PlayerData["Save"] | keyof PlayerData["Dynamic"]];

type LockedData = "Save.LastUpdate" | "Save.IsNewProfile";

type PickKeyofSlice<T extends keyofPlayerDataSlices, K extends "Save" | "Dynamic"> = {
	[C in T]: C extends `${K}.${infer R}` ? R : never;
}[T];

export type ConvertKeyofSlice<T extends KeyofPlayerDataSlices> = ExcludeMembers<
	{
		Save: {
			[K in PickKeyofSlice<T, "Save">]: K extends keyof PlayerData["Save"] ? PlayerData["Save"][K] : never;
		};
		Dynamic: PickKeyofSlice<T, "Dynamic"> extends never
			? never
			: {
					[K in PickKeyofSlice<T, "Dynamic">]: K extends keyof PlayerData["Dynamic"]
						? PlayerData["Dynamic"][K]
						: never;
			  };
	},
	never
>;

export type KeyofPlayerDataSlices = Exclude<keyofPlayerDataSlices, LockedData>;
