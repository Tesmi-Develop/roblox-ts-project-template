import React, { createElement, PropsWithChildren, useEffect, useRef, useState } from "@rbxts/react";
import * as ReactRoblox from "@rbxts/react-roblox";
import { CreateReactStory } from "@rbxts/ui-labs";
import { ReturnControls } from "@rbxts/ui-labs/src/ControlTypings/Typing";
import { InferProps, StoryCreation } from "@rbxts/ui-labs/src/Typing/Typing";
import { withScaler } from "client/wrappers/with-scaler";
import { AppContext } from "../app/app-context";
import { useScalerApi } from "./scaler/context";

function ScalerComponent(props: PropsWithChildren) {
	const scalerApi = useScalerApi();
	const ref = useRef<Frame>();
	const [screenGui, setScreenGui] = useState<ScreenGui>();

	useEffect(() => {
		if (!ref.current) return;
		setScreenGui(ref.current.FindFirstAncestorOfClass("ScreenGui"));
	}, [ref.current]);

	return (
		<>
			<frame BackgroundTransparency={1} key={"Pointer"} ref={ref} />
			{screenGui !== undefined ? (
				<AppContext.Provider value={{ ScreenGui: screenGui!, PlayerGui: undefined!, ScalerApi: scalerApi }}>
					{ReactRoblox.createPortal(
						<uiscale Scale={scalerApi.scale} key={"app-scaler"} />,
						screenGui,
						"app-scaler",
					)}
					{props.children}
				</AppContext.Provider>
			) : (
				<></>
			)}
		</>
	);
}

export function QuickStory<C extends ReturnControls>(
	controls: C,
	render: StoryCreation<InferProps<C>, ReturnType<(typeof React)["createElement"]>>,
) {
	const finalControls = (controls as unknown as Map<unknown, unknown>).isEmpty() ? undefined : controls;
	const Component = withScaler(ScalerComponent as never);

	return CreateReactStory({ controls: finalControls as C, react: React, reactRoblox: ReactRoblox }, (...args) => {
		return <Component>{createElement(render, ...(args as never as never[]))}</Component>;
	});
}
