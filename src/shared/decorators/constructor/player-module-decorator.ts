import { Reflect } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
import { PlayerDynamicData, PlayerSave } from "types/player/player-data";

/** @server */
export interface OnSendData {
	/** @hidden */
	OnSendData(profile: PlayerSave, dynamicData: PlayerDynamicData): void;
}

/** @server */
export interface OnStartModule {
	/** @hidden */
	OnStartModule(): void;
}

/** @server */
export interface OnStopModule {
	/** @hidden */
	OnStopModule(): void;
}

export const PlayerModules = new Map<string, Constructor>();

/** @metadata reflect identifier flamework:implements */
export const PlayerModuleDecorator = (
	config: {
		loadOrder?: number;
	} = {},
) => {
	return (object: Constructor) => {
		PlayerModules.set(`${object}`, object);
		Reflect.defineMetadata(object, "playerModule:loadOrder", config.loadOrder);
	};
};
