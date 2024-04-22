import { Components } from "@flamework/components";
import { AbstractConstructorRef } from "@flamework/components/out/utility";
import { Janitor } from "@rbxts/janitor";
import { useDeferState } from "@rbxts/pretty-react-hooks";
import { useEffect } from "@rbxts/react";
import { useFlameworkDependency } from "./use-flamework-depedency";

/** @metadata macro */
export function useComponents<T extends object>(componentSpecifier?: AbstractConstructorRef<T>): T[] {
	assert(componentSpecifier, "componentSpecifier must be specified");

	const components = useFlameworkDependency<Components>();
	const [componentInstances, setComponentInstances] = useDeferState<T[]>(
		components.getAllComponents(componentSpecifier),
	);

	useEffect(() => {
		const janitor = new Janitor();

		janitor.Add(
			components.onComponentAdded<T>((component) => {
				setComponentInstances((state) => [...state, component]);
			}, componentSpecifier),
		);

		janitor.Add(
			components.onComponentRemoved<T>((component) => {
				setComponentInstances((state) => state.filter((b) => b !== component));
			}, componentSpecifier),
		);

		return () => janitor.Destroy();
	}, []);

	return componentInstances;
}
