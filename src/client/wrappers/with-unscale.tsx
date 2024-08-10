import { BindingOrValue, mapBinding } from "@rbxts/pretty-react-hooks";
import React, { FunctionComponent } from "@rbxts/react";
import { useScalerApi } from "client/ui/hooks/scaler/context";

export function withUnscale<P extends { position: BindingOrValue<UDim2> }>(Component: FunctionComponent<P>) {
	return (props: P) => {
		const scaler = useScalerApi();
		props.position = mapBinding(props.position, (v) => scaler.unscale.udim2(v.X.Offset, v.Y.Offset));
		return <Component {...props} />;
	};
}
