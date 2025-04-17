import { Flamework } from "@flamework/core";
import Object from "@rbxts/object-utils";

/* eslint-disable prettier/prettier */
export const IS_ENABLED_MULTIPLE_PLACES = false;
export enum Place {
	Game = "Game",
}

export const SettedPlaces = new Set(Object.keys(Place));
export type PlaceNames = keyof typeof Place;

const id = game.PlaceId;
const placeNameGuard = Flamework.createGuard<Place>();
let cachedPlaceName: Place | undefined;

export const GetPlaceName = (): Place => {
	if (!IS_ENABLED_MULTIPLE_PLACES) return Place.Game;
	if (cachedPlaceName) return cachedPlaceName;

	return cachedPlaceName = Place.Game;
}
