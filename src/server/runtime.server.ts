import { Flamework, Modding } from "@flamework/core";
import { CommanderServer } from "@rbxts/commander";
import Log, { Logger } from "@rbxts/log";
import TestEZ from "@rbxts/testez";
import { StartFlameworkUtils } from "shared/flamework-utils";
import { GetPlaceName, IS_ENABLED_MULTIPLE_PLACES } from "shared/places";
import { IS_DEV } from "shared/utilities/constants";
import { SetupLogger } from "shared/utilities/setup-logger";
import { ClearAllTestPlayers } from "./utility-for-tests";
import { SetTestMode } from "./utility-for-tests/test-mode";
import { CommandTypes } from "shared/command-types/registery-type";

Flamework.addPaths("src/server");
Flamework.addPaths("src/shared");

Modding.registerDependency<Logger>((ctor) => {
	SetupLogger();
	return Log.ForContext(ctor);
});

StartFlameworkUtils();
Flamework.ignite();

CommanderServer.start(
	(registery) => {
		registery.registerType(...CommandTypes);

		Flamework.addPaths("src/commands");
		registery.register();
	},
	{
		registerBuiltInTypes: true,
	},
)
	.catch((err) => warn(`[Commander]: ${err}`))
	.await();

if (IS_DEV) {
	SetTestMode(true);
	TestEZ.TestBootstrap.run([script.Parent!], TestEZ.Reporters.TextReporter);
	SetTestMode(false);
	ClearAllTestPlayers();
}

if (IS_ENABLED_MULTIPLE_PLACES) {
	Log.Debug(`Started on ${GetPlaceName()}`);
}
