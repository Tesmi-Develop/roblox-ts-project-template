import { DeepFreezeTable } from "shared/utilities/object-utilities";
import { DeepReadonly } from "types/utility";
import { GameData } from "./game-data-types";

const gameDataSchema: GameData = {};

export const GameDataSchema = DeepFreezeTable(gameDataSchema) as DeepReadonly<GameData>;
