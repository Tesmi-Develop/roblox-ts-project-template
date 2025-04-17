import { BaseComponent } from "@flamework/components";
import { Dependency, Flamework, Modding, OnInit, OnStart, Service } from "@flamework/core";
import Log, { Logger } from "@rbxts/log";
import { RunService } from "@rbxts/services";
import { PlayerComponent } from "server/components/player-component";
import { StartFlameworkUtils } from "shared/flamework-utils";
import { IS_STUDIO } from "shared/utilities/constants";
import { CreateIdGenerator } from "shared/utilities/function-utilities";
import { GetIdentifier } from "shared/utilities/object-utilities";
import { SetupLogger } from "shared/utilities/setup-logger";

let isStartingFlamework = false;

if (IS_STUDIO) {
	Modding.registerDependency<Logger>((ctor) => {
		SetupLogger();
		return Log.ForContext(ctor);
	});
}

const nextId = CreateIdGenerator(false);

export function createComponentStub<T extends new (...args: never[]) => BaseComponent>(
	constructor: T,
	instance: object,
	...dependencies: ConstructorParameters<T>
) {
	const [component, construct] = Modding.createDeferredDependency(constructor, { handle: (_, i) => dependencies[i] });
	component.instance = instance as never;
	construct();
	return component as InstanceType<T>;
}

const TryStartFlamework = () => {
	if (isStartingFlamework) return;
	isStartingFlamework = true;

	Flamework.addPaths("src/server");
	Flamework.addPaths("src/shared");

	StartFlameworkUtils();

	if (!RunService.IsRunMode()) {
		Flamework.ignite();
	}
	LoadServices();
};

export const LoadServices = () => {
	if (!RunService.IsRunMode()) {
		Modding.getDecorators<typeof Service>().forEach((value) => {
			pcall(() => {
				const instance = Dependency(GetIdentifier(value.object) as never) as OnStart & OnInit;
				if ("onStart" in instance) {
					instance.onStart();
				}

				if ("onInit" in instance) {
					instance.onInit();
				}
			});
		});
	}
};

const testPlayers = new Set<PlayerComponent>();

export function ClearAllTestPlayers() {
	testPlayers.forEach((player) => player.destroy());
	testPlayers.clear();
}

export async function CreateTestPlayer() {
	TryStartFlamework();
	const id = nextId();
	const player = createComponentStub(PlayerComponent, {
		Name: `TestPlayer${id}`,
		UserId: id,
	});

	testPlayers.add(player);
	await player.onStart();
	player.StartReplication();

	return player;
}
