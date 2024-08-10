import { Flamework, Modding } from "@flamework/core";
import { Start } from "@rbxts/better-refx";
import { CommanderClient, CommanderInterface } from "@rbxts/commander";
import Log, { Logger } from "@rbxts/log";
import { CommandTypes } from "shared/command-types/registery-type";
import { StartFlameworkUtils } from "shared/flamework-utils";
import { SetupLogger } from "shared/utilities/setup-logger";

Flamework.addPaths("src/shared");
Flamework.addPaths("src/client");

Modding.registerDependency<Logger>((ctor) => {
	SetupLogger();
	return Log.ForContext(ctor);
});

Start();
StartFlameworkUtils();
Flamework.ignite();

CommanderClient.start(
	(registery) => {
		registery.registerType(...CommandTypes);
		registery.register();
	},
	{
		registerBuiltInTypes: true,
		interface: CommanderInterface.create({
			activationKeys: [Enum.KeyCode.Backquote],
		}),
	},
)
	.catch((err) => warn(`[Commander]: ${err}`))
	.await();
