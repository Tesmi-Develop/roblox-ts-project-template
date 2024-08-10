import React, { PropsWithChildren, Ref, RefObject, forwardRef } from "@rbxts/react";

export const Canvas = forwardRef(
	(props: { Key?: string; ref?: RefObject<ScrollingFrame> } & PropsWithChildren, ref: Ref<ScreenGui>) => {
		return (
			<screengui
				ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
				IgnoreGuiInset={true}
				key={props.Key}
				ResetOnSpawn={false}
				ref={ref}
			>
				{props.children}
			</screengui>
		);
	},
);
