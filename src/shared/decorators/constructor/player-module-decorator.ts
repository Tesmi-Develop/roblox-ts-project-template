import { Reflect } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
import { Draft } from "@rbxts/immut/src/types-external";
import { PlayerData, playerData } from "shared/schemas/player-data-types";

/** @server */
export interface OnSendData {
	/** @hidden */
	OnSendData(data: Draft<playerData>, original: PlayerData): void;
}

/** @server */
export interface OnStartModule {
	/** @hidden */
	OnStartModule(): void;
}

/** @server */
export interface OnDestroyModule {
	/** @hidden */
	OnDestroyModule(): void;
}

export const PlayerModules = new Map<string, Constructor>();

/** @metadata reflect identifier flamework:implements */
export const PlayerModule = (
	config: {
		loadOrder?: number;
		IsDisableInTestMode?: boolean;
	} = {},
) => {
	return (object: Constructor) => {
		PlayerModules.set(`${object}`, object);
		Reflect.defineMetadata(object, "playerModule:config", config);
		Reflect.defineMetadata(object, "playerModule:loadOrder", config.loadOrder);
	};
};
