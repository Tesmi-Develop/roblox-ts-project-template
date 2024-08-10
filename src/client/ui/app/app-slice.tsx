import React from "@rbxts/react";
import { useAppContext } from "./app-context";
import { Display } from "@rbxts/react-tooltips";
import { Apps } from "../settings/apps";
import { GetPlaceName } from "shared/places";

export const AppSlice = () => {
	const appContext = useAppContext();
	const Component = Apps[GetPlaceName()];
	return (
		<>
			<uiscale Scale={appContext.ScalerApi.scale} key={"app-scaler"} />
			<Display key={"display"} />
			{Component ? <Component /> : <></>}
		</>
	);
};
