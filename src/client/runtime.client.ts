import { Flamework, Modding } from "@flamework/core";
import { Start } from "@rbxts/better-refx";
import { Centurion } from "@rbxts/centurion";
import { CenturionUI } from "@rbxts/centurion-ui";
import Log, { Logger } from "@rbxts/log";
import { StartFlameworkUtils } from "shared/flamework-utils";
import { LoadGameDataFromReplicatedStorage } from "shared/singletons/data-collection";
import { SetupLogger } from "shared/utilities/setup-logger";

Flamework.addPaths("src/shared");
Flamework.addPaths("src/client");

Modding.registerDependency<Logger>((ctor) => {
	SetupLogger();
	return Log.ForContext(ctor);
});

LoadGameDataFromReplicatedStorage();
Start();
StartFlameworkUtils();
Flamework.ignite();

Centurion.client()
	.start()
	.then(() =>
		CenturionUI.start(Centurion.client(), {
			activationKeys: [Enum.KeyCode.Backquote],
		}),
	)
	.catch((err) => warn("Failed to start Centurion:", err));
