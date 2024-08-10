import React, { FunctionComponent } from "@rbxts/react";
import { useScaler } from "@rbxts/ui-scaler";
import { ScalerContext } from "client/ui/hooks/scaler/context";

const BASE_RESOLUTION = new Vector2(1920, 1080);

export function withScaler<P extends {}>(Component: FunctionComponent<P>) {
	return (props: P) => {
		const scaleApi = useScaler(BASE_RESOLUTION);
		return <ScalerContext.Provider value={scaleApi}>{<Component {...props} />}</ScalerContext.Provider>;
	};
}
