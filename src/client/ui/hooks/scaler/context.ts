import { createContext, useContext } from "@rbxts/react";
import { ScalerApi } from "@rbxts/ui-scaler";

export const ScalerContext = createContext<ScalerApi>(undefined!);

export function useScalerApi() {
	const context = useContext(ScalerContext);
	assert(context, "ScalerContext not found. Did you call outside of ScalerContext?");
	return context;
}
