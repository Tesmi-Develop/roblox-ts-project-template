import { FunctionComponent } from "@rbxts/react";
import { PlaceNames } from "shared/places";
import { AppGameSlice } from "../app/places/game";

export const Apps: Partial<Record<PlaceNames, FunctionComponent>> = {
	Game: AppGameSlice,
};
