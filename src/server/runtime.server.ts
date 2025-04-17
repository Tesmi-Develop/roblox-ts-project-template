import { Flamework, Modding } from "@flamework/core";
import { Centurion } from "@rbxts/centurion";
import Log, { Logger } from "@rbxts/log";
import TestEZ from "@rbxts/testez";
import { StartFlameworkUtils } from "shared/flamework-utils";
import { GetPlaceName, IS_ENABLED_MULTIPLE_PLACES } from "shared/places";
import { DataCollectionHandler, LoadGameDataFromReplicatedStorage } from "shared/singletons/data-collection";
import { IS_DEV } from "shared/utilities/constants";
import { SetupLogger } from "shared/utilities/setup-logger";
import { DataStructureMock } from "../shared/game-data/mock-data-structure";
import { isOwner } from "./game-utilities/is-owner";
import { ClearAllTestPlayers } from "./utility-for-tests";
import { SetTestMode } from "./utility-for-tests/test-mode";

Flamework.addPaths("src/server");
Flamework.addPaths("src/shared");

Modding.registerDependency<Logger>((ctor) => {
	SetupLogger();
	return Log.ForContext(ctor);
});

LoadGameDataFromReplicatedStorage();
StartFlameworkUtils();
Flamework.ignite();

Centurion.server({ syncFilter: (player) => isOwner(player) }).start();

if (IS_DEV) {
	DataCollectionHandler.Init(DataStructureMock);

	SetTestMode(true);
	TestEZ.TestBootstrap.run([script.Parent!], TestEZ.Reporters.TextReporter);
	SetTestMode(false);

	LoadGameDataFromReplicatedStorage();
	ClearAllTestPlayers();
}

if (IS_ENABLED_MULTIPLE_PLACES) {
	Log.Debug(`Started on ${GetPlaceName()}`);
}
