import { createProducer } from "@rbxts/reflex";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { DeepCloneTable } from "shared/utilities/object-utilities";
import { DeepWritable } from "types/utility";

export const playerDataSlice = createProducer(
	DeepCloneTable(PlayerDataSchema) as DeepWritable<typeof PlayerDataSchema>,
	{},
);
