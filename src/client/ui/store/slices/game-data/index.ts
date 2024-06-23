import { createProducer } from "@rbxts/reflex";
import { GameDataSchema } from "shared/schemas/game-data";
import { DeepCloneTable } from "shared/utilities/object-utilities";

export const gameDataSlice = createProducer(DeepCloneTable(GameDataSchema), {});
