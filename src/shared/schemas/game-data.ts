import { DeepFreezeTable } from "shared/utilities/object-utilities";
import { DeepReadonly } from "types/utility";

const gameDataSchema = {};
export const GameDataSchema = DeepFreezeTable(gameDataSchema) as DeepReadonly<typeof gameDataSchema>;

export type GameData = typeof GameDataSchema;
