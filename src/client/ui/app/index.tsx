import React, { useState } from "@rbxts/react";
import { ReflexProvider } from "@rbxts/react-reflex";
import { PlayerGui } from "shared/utilities/constants";
import { Canvas } from "../components/canvas";
import { useScalerApi } from "../hooks/scaler/context";
import RootProducer from "../store";
import { AppContext } from "./app-context";
import { AppSlice } from "./app-slice";
import { withScaler } from "client/wrappers/with-scaler";
import { withTooltips } from "client/wrappers/with-tooltips";

export const ScreenGUIName = "react-root";

export const App = withTooltips(
	withScaler(() => {
		const scalerApi = useScalerApi();
		const [ref, setRef] = useState<ScreenGui>();

		return (
			<AppContext.Provider value={{ ScreenGui: ref!, PlayerGui: PlayerGui, ScalerApi: scalerApi }}>
				<ReflexProvider producer={RootProducer}>
					<Canvas Key={ScreenGUIName} ref={setRef}>
						{ref && <AppSlice />}
					</Canvas>
				</ReflexProvider>
			</AppContext.Provider>
		);
	}),
);
