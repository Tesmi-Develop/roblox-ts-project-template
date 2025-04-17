/* eslint-disable prettier/prettier */
import { Players, RunService } from "@rbxts/services";
import { config, SpringOptions } from "@rbxts/ripple";
import { $keys } from "rbxts-transformer-keys";
import { InstanceAttributes } from "@rbxts/react";

/** @client */
export const LocalPlayer = Players.LocalPlayer;

export const Day = 86400;
export const Hour = 3600;
export const Minute = 60;

export const Springs = {
	...config.spring,
	bubbly: { tension: 400, friction: 14 },
	responsive: { tension: 400 },
	gentle: { tension: 250, friction: 30 },
	smooth: { tension: 400, friction: 50 },
} satisfies { [config: string]: SpringOptions };

export const UIGridLayoutProps = $keys<InstanceAttributes<UIGridLayout>>();
export const UIListLayoutProps = $keys<InstanceAttributes<UIListLayout>>();
export const UIPaddingProps = $keys<InstanceAttributes<UIPadding>>();
export const TextLabelProps = $keys<InstanceAttributes<TextLabel>>();

export const UDim2s = {
	Center: UDim2.fromScale(0.5, 0.5),
	Left: UDim2.fromScale(0, 0.5),
	Right: UDim2.fromScale(1, 0.5),
	Top: UDim2.fromScale(0.5, 0),
	Bottom: UDim2.fromScale(0.5, 1),
	Full: UDim2.fromScale(1, 1),
};

export const Positions = {
	Center: UDim2.fromScale(0.5, 0.5),
	Left: UDim2.fromScale(0, 0.5),
	Right: UDim2.fromScale(1, 0.5),
	Top: UDim2.fromScale(0.5, 0),
	Bottom: UDim2.fromScale(0.5, 1),
	Full: UDim2.fromScale(1, 1),
};

export const Anchors = {
	Center: new Vector2(0.5, 0.5),
	Left: new Vector2(0, 0.5),
	LeftTop: new Vector2(0, 0),
	Right: new Vector2(1, 0.5),
	RightTop: new Vector2(1, 0),
	Top: new Vector2(0.5, 0),
	TopRight: new Vector2(1, 0),
	Bottom: new Vector2(0.5, 1),
	BottomRight: new Vector2(1, 1),
	bottomLeft: new Vector2(0, 1),
};

export const IS_SERVER = RunService.IsServer();
export const IS_CLIENT = RunService.IsClient();
export const IS_DEV = RunService.IsStudio();
export const IS_PROD = !IS_DEV;
export const IS_STUDIO = !RunService.IsRunning();

/** @client */
export const PlayerGui =
	IS_CLIENT && RunService.IsRunning()
		? (LocalPlayer.WaitForChild("PlayerGui") as PlayerGui)
		: (undefined as unknown as PlayerGui);

export const PATCH_ACTION_REMOVE = "___PATCH_ACTION_REMOVE";
