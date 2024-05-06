import { Flamework } from "@flamework/core";
import("./store");

Flamework.addPaths("src/server/components");
Flamework.addPaths("src/server/services");
Flamework.addPaths("src/server/player-modules");

Flamework.addPaths("src/shared/actions");
Flamework.addPaths("src/shared/components");
Flamework.addPaths("src/shared/game-data");

Flamework.ignite();
