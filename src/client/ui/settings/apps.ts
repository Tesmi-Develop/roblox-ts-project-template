import { FunctionComponent } from "@rbxts/react";
import { PlaceNames } from "shared/places";
import { AppGameSlice } from "../app/places/game";

export const Apps: Partial<Record<PlaceNames, { Component: FunctionComponent; IgnoreGuiInset: boolean }>> = {
	Game: { Component: AppGameSlice, IgnoreGuiInset: true },
};
