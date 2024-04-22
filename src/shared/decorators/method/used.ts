import { Reflect } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
import { IS_CLIENT, IS_SERVER } from "shared/utilities/constants";
import { ModifyConstructorMethod } from "shared/utilities/function-utilities";

export const Used = (side: "Client" | "Server") => {
	return (object: object, fieldName: string) => {
		let data = Reflect.getMetadata(object, "UsedFields") as Map<string, "Client" | "Server">;

		if (data) {
			data.set(fieldName, side);
			return;
		}

		data = new Map();
		data.set(fieldName, side);
		Reflect.defineMetadata(object, "UsedFields", data);

		ModifyConstructorMethod(object as Constructor, "constructor", (originalConstructor) => {
			return function (this, ...args) {
				const mt = getmetatable(this) as { __index: (self: object, index: unknown) => void };
				const usedFields = Reflect.getMetadata<Map<string, "Client" | "Server">>(object, "UsedFields")!;

				mt.__index = (t, index) => {
					if (usedFields.has(index as string)) {
						const isRightUsedSide = side === "Client" ? IS_CLIENT : IS_SERVER;
						const anotherSide = side === "Client" ? "Server" : "Client";
						assert(isRightUsedSide, `Can't use field ${index} on ${anotherSide.lower()}`);
					}

					return mt[index as never];
				};

				return originalConstructor(this, ...args);
			};
		});
	};
};
