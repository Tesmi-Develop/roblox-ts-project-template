import React, { useState } from "@rbxts/react";
import { AppContext } from "./app-context";
import { PlayerGui } from "shared/utilities/constants";
import { AppSlice } from "./app-slice";

export const ScreenGUIName = "react-root";

export const App = () => {
	const [ref, setRef] = useState<ScreenGui>();

	return (
		<AppContext.Provider value={{ ScreenGui: ref!, PlayerGui: PlayerGui }}>
			<screengui
				ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
				IgnoreGuiInset={true}
				key={ScreenGUIName}
				ResetOnSpawn={false}
				ref={setRef}
			>
				{ref && <AppSlice />}
			</screengui>
		</AppContext.Provider>
	);
};
