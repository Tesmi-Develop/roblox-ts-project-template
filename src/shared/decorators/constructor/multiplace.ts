import { getIdFromSpecifier } from "@flamework/components/out/utility";
import { Constructor } from "@flamework/core/out/utility";
import { AddMultiplaceObject } from "shared/flamework-utils";
import { Place, PlaceNames, SettedPlaces } from "shared/places";

export const Multiplace = (typeFilter: "Include" | "Exclude", places: Place[] | PlaceNames) => {
	return (ctor: Constructor) => {
		const currentPlaces = typeIs(places, "string") ? [places] : places;

		if (typeFilter === "Exclude") {
			const allPlaces = table.clone(SettedPlaces);
			currentPlaces.forEach((name) => allPlaces.delete(name));

			AddMultiplaceObject(getIdFromSpecifier(ctor)!, [...allPlaces]);
			return;
		}

		AddMultiplaceObject(getIdFromSpecifier(ctor)!, currentPlaces);
	};
};
