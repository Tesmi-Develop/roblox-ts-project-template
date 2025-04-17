import { useEventListener } from "@rbxts/pretty-react-hooks";
import { useBinding } from "@rbxts/react";
import { RunService } from "@rbxts/services";

export function useRotation(speed: number, isReverse = false) {
	const [rotation, setRotation] = useBinding(0);

	useEventListener(RunService.Heartbeat, (dt) => {
		let nextValue = rotation.getValue() + (isReverse ? -1 : 1) * dt * speed;
		if (nextValue >= 360) nextValue -= 360;
		if (nextValue < 0) nextValue += 360;

		setRotation(nextValue);
	});

	return rotation;
}
