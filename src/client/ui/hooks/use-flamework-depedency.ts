import { Dependency, Flamework } from "@flamework/core";
import { IntrinsicSymbolId } from "@flamework/core/out/utility";
import { useMemo } from "@rbxts/react";

/** @metadata macro {@link Flamework.resolveDependency intrinsic-flamework-rewrite} */
export function useFlameworkDependency<T>(id?: IntrinsicSymbolId<T>): T {
	assert(id, "id must be defined");
	return useMemo(() => Dependency(id), []);
}
