import { useLatest, useMountEffect } from "@rbxts/pretty-react-hooks";
import { Binding, useBinding, useMemo } from "@rbxts/react";
import { Motion, MotionGoal, createMotion } from "@rbxts/ripple";

export function useMotion(
	initialValue: number,
	onComplete?: (lastValue: number) => void,
): LuaTuple<[Binding<number>, Motion, number]>;

export function useMotion<T extends MotionGoal>(
	initialValue: T,
	onComplete?: (lastValue: T) => void,
): LuaTuple<[Binding<T>, Motion<T>, T]>;

export function useMotion<T extends MotionGoal>(initialValue: T, onComplete?: (lastValue: T) => void) {
	const motion = useMemo(() => {
		return createMotion(initialValue);
	}, []);
	const initValue = useMemo(() => initialValue, []);
	const onCompleteRef = useLatest(onComplete);

	const [binding, setValue] = useBinding(initialValue);

	useMountEffect(() => {
		motion.onStep((v) => setValue(v));
		motion.onComplete((val) => {
			if (!onCompleteRef.current) return;
			onCompleteRef.current(val);
		});

		motion.start();
		return () => motion.destroy();
	});

	return $tuple(binding, motion, initValue);
}
