import React, { FunctionComponent } from "@rbxts/react";
import ReactTooltips from "@rbxts/react-tooltips";

export function withTooltips<P extends {}>(Component: FunctionComponent<P>) {
	return (props: P) => {
		return (
			<ReactTooltips.Provider>
				<Component {...props} />
			</ReactTooltips.Provider>
		);
	};
}
