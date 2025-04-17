import { MutableRefObject, RefCallback } from "@rbxts/react";

export function MultiplyUDim2(UDim: UDim2, Multiplier: number) {
	return new UDim2(
		UDim.X.Scale * Multiplier,
		UDim.X.Offset * Multiplier,
		UDim.Y.Scale * Multiplier,
		UDim.Y.Offset * Multiplier,
	);
}

export function CreateAssetUrl(id: string | number = "") {
	if (typeIs(id, "string")) return id;
	return `rbxassetid://${id}`;
}

export function CheckMappingNames(name: string, searchString: string) {
	return searchString.lower() === name.lower().sub(1, searchString.size());
}

export function combinePropsWithDefault<T extends object, D extends Partial<T>>(props: T, defaultProps: D) {
	// eslint-disable-next-line roblox-ts/no-array-pairs
	for (const [key, value] of pairs(defaultProps)) {
		if (props[key as never] === undefined) {
			props[key as never] = value as never;
		}
	}

	return props as T & D;
}

export function PickProps<O extends object, C extends keyof O>(props: O, propNames: readonly C[], ) {
	const newProps = {} as Pick<O, C>;

	for (const [key, value] of pairs(props)) {
		if (propNames.includes(key as C)) {
			newProps[key as never] = value as never;
		}
	}

	return newProps;
}

export function ExcludeProps<O extends object, C extends keyof O>(props: O, propNames: readonly C[]) {
	const newProps = table.clone(props) as Omit<O, C>;

	propNames.forEach((value, index) => {
		newProps[value as never] = undefined as never;
	});

	return newProps;
}
