import { lerp } from "@rbxts/pretty-react-hooks";

export function lerpStrict(a: number, b: number, t: number) {
	return math.clamp(lerp(a, b, t), math.min(a, b), math.max(a, b));
}

export function mapStrict(value: number, min: number, max: number, newMin: number, newMax: number) {
	if (min === max) {
		return newMin;
	}
	return lerpStrict(newMin, newMax, (value - min) / (max - min));
}

export function GetModelDiagonalLength(model: Model) {
	const size = model.GetExtentsSize();

	return math.sqrt(size.X ** 2 + size.Z ** 2);
}

export function RemoveYComponent(vector: Vector3) {
	return new Vector3(vector.X, 0, vector.Z);
}

export function MapNumberToRange(value: number, min1: number, max1: number, min2: number, max2: number): number {
	const normalizedValue = (value - min1) / (max1 - min1);
	return min2 + normalizedValue * (max2 - min2);
}
