import { useMotion } from "@rbxts/pretty-react-hooks";
import { useEffect } from "@rbxts/react";
import { Springs } from "shared/utilities/constants";

export function useProgressBar(
	value: number,
	maxValue: number,
	style: keyof typeof Springs = "default",
	onComplete?: (v: number) => void,
	onStep?: (v: number) => void,
) {
	const target = math.clamp(value / maxValue, 0, 1);
	const [percent, percentMotion] = useMotion(target);

	useEffect(() => {
		percentMotion.spring(target, Springs[style]);
		const con1 = percentMotion.onStep((v) => onStep?.(v));
		const con2 = percentMotion.onComplete(onComplete ?? (() => {}));

		return () => {
			con1();
			con2();
		};
	}, [target]);

	return percent;
}
