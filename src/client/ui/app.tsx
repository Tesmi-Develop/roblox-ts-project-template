import React, { useState } from "@rbxts/react";
import { AppContext } from "./app-context";

export const ScreenGUIName = "react-root";

const AppSlice = () => {
	return (
		<>
			<frame></frame>
		</>
	);
};

export const App = () => {
	const [ref, setRef] = useState<ScreenGui>();
	return (
		<AppContext.Provider value={{ ScreenGui: ref! }}>
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
