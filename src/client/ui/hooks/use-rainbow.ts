import { BindingOrValue, getBindingValue, useEventListener } from "@rbxts/pretty-react-hooks";
import { useBinding } from "@rbxts/react";
import { RunService } from "@rbxts/services";

const colors = [
	Color3.fromRGB(255, 0, 4),
	Color3.fromRGB(255, 149, 0),
	Color3.fromRGB(251, 255, 6),
	Color3.fromRGB(28, 255, 26),
	Color3.fromRGB(44, 93, 255),
	Color3.fromRGB(255, 26, 252),
];

function sort(t: ColorSequenceKeypoint[]) {
	const newtab: ColorSequenceKeypoint[] = [];

	for (const i of $range(0, t.size() - 1)) {
		let got: ColorSequenceKeypoint | undefined = undefined;

		for (const v of t) {
			if (!newtab.includes(v)) {
				if (got === undefined || v.Time < got.Time) {
					got = v;
				}
			}
		}

		newtab[i] = got!;
	}

	newtab[0] = new ColorSequenceKeypoint(0, newtab[newtab.size() - 2].Value);
	newtab[newtab.size() - 1] = new ColorSequenceKeypoint(1, newtab[1].Value);

	return newtab;
}

const calc = (i: number, s: number, vc: number) => ((tick() + (s / vc) * i) % s) / s;

export function useRainbow(interval: BindingOrValue<number>) {
	const [color, setColor] = useBinding(new ColorSequence(new Color3(0, 0, 0)));

	useEventListener(RunService.RenderStepped, () => {
		const start = new ColorSequenceKeypoint(0, Color3.fromRGB(0, 0, 0));
		const finish = new ColorSequenceKeypoint(1, Color3.fromRGB(0, 0, 0));

		let tab = [start, finish];

		for (const i of $range(0, colors.size() - 1)) {
			tab.push(new ColorSequenceKeypoint(calc(i, getBindingValue(interval), colors.size()), colors[i]));
		}

		tab = sort(tab);
		const rainbow = new ColorSequence(tab);
		setColor(rainbow);
	});

	return color;
}
