import { Springs } from "shared/utilities/constants";
import { useMotion } from "./use-motion";
import { useEffect } from "@rbxts/react";

export function useAnimationBar(value: number, maxValue: number) {
	const [percent, percentMotion] = useMotion(value / maxValue);

	useEffect(() => {
		percentMotion.spring(value / maxValue, Springs.default);
	}, [value]);

	return percent;
}
