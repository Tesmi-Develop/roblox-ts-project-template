import { createContext, useContext } from "@rbxts/react";

interface AppContext {
	ScreenGui: ScreenGui;
}

export const AppContext = createContext<AppContext>(undefined!);

export const useAppContext = () => {
	return useContext(AppContext);
};

export const useScreenGui = () => {
	const { ScreenGui } = useAppContext();
	return ScreenGui;
};
