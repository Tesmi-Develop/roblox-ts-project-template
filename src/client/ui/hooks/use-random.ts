import { useRef } from "@rbxts/react";

export function useRandom(seed?: number) {
	const ref = useRef<Random>();
	!ref.current && (ref.current = seed ? new Random(seed) : new Random());

	return ref.current;
}
