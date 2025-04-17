import React, { useState } from "@rbxts/react";
import { ReflexProvider } from "@rbxts/react-reflex";
import { withScaler } from "client/wrappers/with-scaler";
import { GetPlaceName } from "shared/places";
import { PlayerGui } from "shared/utilities/constants";
import { useScalerApi } from "../hooks/scaler/context";
import { Apps } from "../settings/apps";
import RootProducer from "../store";
import { AppContext } from "./app-context";
import { Canvas } from "../utility-components/canvas";

export const ScreenGUIName = "react-root";

export const App = withScaler(() => {
	const scalerApi = useScalerApi();
	const [ref, setRef] = useState<ScreenGui>();
	const ComponentData = Apps[GetPlaceName()];

	return (
		<AppContext.Provider value={{ ScreenGui: ref!, PlayerGui: PlayerGui, ScalerApi: scalerApi }}>
			<ReflexProvider producer={RootProducer}>
				<Canvas Key={ScreenGUIName} ref={setRef} ignoreGuiInset={ComponentData?.IgnoreGuiInset}>
					{ref ? (
						<>
							<uiscale Scale={scalerApi.scale} key={"app-scaler"} />
							{ComponentData ? <ComponentData.Component /> : <></>}
						</>
					) : (
						<></>
					)}
				</Canvas>
			</ReflexProvider>
		</AppContext.Provider>
	);
});
