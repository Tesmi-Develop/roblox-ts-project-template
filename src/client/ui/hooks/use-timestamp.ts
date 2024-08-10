import { useEventListener, getBindingValue, BindingOrValue } from "@rbxts/pretty-react-hooks";
import { useBinding } from "@rbxts/react";
import { RunService } from "@rbxts/services";
import { GetCurrentTime, GetDifferenceNowTime, round } from "shared/utilities/function-utilities";

export function useTimestamp(endTime: BindingOrValue<number>, showMiliseconds = false) {
	const [time, setTime] = useBinding(0);

	useEventListener(RunService.Heartbeat, () => {
		if (getBindingValue(endTime) - GetCurrentTime() < 0) {
			setTime(0);
			return;
		}

		const time = GetDifferenceNowTime(getBindingValue(endTime), false);
		setTime(round(time, showMiliseconds ? 1 : 0));
	});

	return time;
}
