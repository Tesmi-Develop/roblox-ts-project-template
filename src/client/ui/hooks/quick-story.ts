import React, { createElement } from "@rbxts/react";
import * as ReactRoblox from "@rbxts/react-roblox";
import { CreateReactStory } from "@rbxts/ui-labs";
import { ReturnControls } from "@rbxts/ui-labs/src/ControlTypings/Typing";
import { StoryCreation } from "@rbxts/ui-labs/src/Typing";
import { withScaler } from "client/wrappers/with-scaler";
import { withTooltips } from "client/wrappers/with-tooltips";

export function QuickStory<C extends ReturnControls>(
	controls: C,
	render: StoryCreation<{ controls: C }, typeof React["createElement"]>,
) {
	const finalControls = (controls as unknown as Map<unknown, unknown>).isEmpty() ? undefined : controls;
	const Component = withTooltips(withScaler(render));

	return CreateReactStory({ controls: finalControls as C, react: React, reactRoblox: ReactRoblox }, (...args) => {
		return createElement(Component, ...args);
	});
}
