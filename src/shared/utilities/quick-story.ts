import React from "@rbxts/react";
import * as ReactRoblox from "@rbxts/react-roblox";
import { CreateReactStory } from "@rbxts/ui-labs";
import { ReturnControls } from "@rbxts/ui-labs/src/ControlTypings/Typing";
import { StoryCreation } from "@rbxts/ui-labs/src/Typing";

export function QuickStory<C extends ReturnControls>(
	controls: C,
	render: StoryCreation<{ controls: C }, typeof React["createElement"]>,
) {
	const finalControls = (controls as unknown as Map<unknown, unknown>).isEmpty() ? undefined : controls;
	return CreateReactStory({ controls: finalControls as C, react: React, reactRoblox: ReactRoblox }, render);
}
