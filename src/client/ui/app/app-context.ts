import { createContext, useContext } from "@rbxts/react";
import { ScalerApi } from "@rbxts/ui-scaler";

interface AppContext {
	ScreenGui: ScreenGui;
	PlayerGui: PlayerGui;
	ScalerApi: ScalerApi;
}

export const AppContext = createContext<AppContext>(undefined!);

export const useAppContext = () => {
	const context = useContext(AppContext);
	assert(context, "AppContext not found. Did you call outside of App");

	return context;
};

export const useScreenGui = () => {
	const { ScreenGui } = useAppContext();
	return ScreenGui;
};
