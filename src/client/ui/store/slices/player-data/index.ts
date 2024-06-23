import { createProducer } from "@rbxts/reflex";
import { PlayerDataSchema } from "shared/schemas/player-data";
import { DeepCloneTable } from "shared/utilities/object-utilities";

export const playerDataSlice = createProducer(DeepCloneTable(PlayerDataSchema), {});
