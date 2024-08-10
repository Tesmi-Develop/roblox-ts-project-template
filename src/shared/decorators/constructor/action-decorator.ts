/* eslint-disable @typescript-eslint/no-explicit-any */
import { Modding, Reflect } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
import { Action } from "shared/actions/action";
import { GetIdentifier } from "shared/utilities/object-utilities";

export const ActionConstructors = new Map<string, Constructor<Action<object, unknown>>>();
export const Actions = new Map<string, Action<any, any>>();

export const ACTION_GUARD_KEY = "actionGuard";

/**
 * @metadata reflect identifier flamework:implements flamework:parameters injectable macro
 */
export const ActionDecorator = <D extends object = {}>(metadata?: Modding.Generic<D, "guard">) => {
	assert(metadata, "Invalid metadata");
	return (ctor: Constructor<Action<D, any>>) => {
		Reflect.defineMetadata(ctor, ACTION_GUARD_KEY, metadata);
		const foundConstructor = ActionConstructors.get(`${ctor}`);

		if (foundConstructor) {
			throw `Attempting to register an item with an existing identifier: ${ctor} Metadata: ${GetIdentifier(
				ctor,
			)}`;
		}

		Actions.set(GetIdentifier(ctor), new ctor());
		ActionConstructors.set(tostring(ctor), ctor);
	};
};
