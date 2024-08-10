import Signal from "@rbxts/rbx-better-signal";
import { IS_STUDIO } from "shared/utilities/constants";

let isTestMode = IS_STUDIO;
const signal = new Signal();

export function IsTestMode() {
	return isTestMode;
}

export function SetTestMode(value: boolean) {
	isTestMode = value;

	if (!value) {
		signal.Fire();
	}
}

export async function WaitForEndTestMode() {
	if (!isTestMode) return;
	signal.Wait();
}
