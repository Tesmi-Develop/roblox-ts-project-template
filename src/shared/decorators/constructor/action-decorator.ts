import { Reflect } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
import { Action } from "shared/actions/action";

export const ActionConstructors = new Map<string, Constructor<Action<object, unknown>>>();

export const ActionDecorator = <D extends object = {}, R = undefined>(Constructor: Constructor<Action<D, R>>) => {
	const foundConstructor = ActionConstructors.get(`${Constructor}`);

	if (foundConstructor) {
		throw `Attempting to register an item with an existing identifier: ${Constructor} Metadata: ${Reflect.getMetadata(
			Constructor,
			"identifier",
		)}`;
	}

	ActionConstructors.set(tostring(Constructor), Constructor);
};
