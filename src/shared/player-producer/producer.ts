import { createProducer } from "@rbxts/reflex";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { DeepCloneTable } from "shared/utilities/object-utilities";

const initialState = DeepCloneTable(PlayerDataSchema);

export const playerProducer = createProducer(initialState, {
	// Actions
	IncrementMoney: (state, amount: number) => {
		return {
			...state,
			Save: {
				...state.Save,
				Money: state.Save.Money + amount,
			},
		};
	},
});
