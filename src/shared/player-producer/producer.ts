import { createProducer } from "@rbxts/reflex";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { DeepCloneTable } from "shared/utilities/object-utilities";

const initialState = DeepCloneTable(PlayerDataSchema);

export const playerProducer = createProducer(initialState, {
	// Actions
});
