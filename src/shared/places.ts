import Object from "@rbxts/object-utils";

/* eslint-disable prettier/prettier */
export const IS_ENABLED_MULTIPLE_PLACES = false;
export const Places = {
	Game: 0, // Paste here
	Unknown: 0,
} satisfies Record<string, number | number[]>;

export const SettedPlaces = new Set(Object.keys(Places));
export type PlaceNames = keyof typeof Places | "Unknown";

const id = game.PlaceId;
const currentPlaceName = Object.entries(Places).find(([_, placeIds]) => placeIds === id)?.[0] ?? "Unknown";

export const GetPlaceName = () => IS_ENABLED_MULTIPLE_PLACES ? currentPlaceName : "Game";
