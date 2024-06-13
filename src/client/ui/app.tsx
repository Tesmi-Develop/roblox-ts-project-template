import React, { useState } from "@rbxts/react";
import { AppContext } from "./app-context";
import { useFlameworkDependency } from "./hooks/use-flamework-depedency";
import { PlayerController } from "client/controllers/player-controller";

export const ScreenGUIName = "react-root";

const AppSlice = () => {
	return (
		<>
			<frame />
		</>
	);
};

export const App = () => {
	const [ref, setRef] = useState<ScreenGui>();
	const playerController = useFlameworkDependency<PlayerController>();

	return (
		<AppContext.Provider value={{ ScreenGui: ref!, Atoms: playerController.GetAtoms() }}>
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
