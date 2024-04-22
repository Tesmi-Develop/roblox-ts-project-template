import { RunService } from "@rbxts/services";

export function OnlyClient(object: object, propertyName: string, description: TypedPropertyDescriptor<Callback>) {
	const method = description.value;

	description.value = function (this, ...args: unknown[]) {
		assert(RunService.IsClient(), `Method ${propertyName} can't be casted on server.`);
		return method(this, ...args);
	};

	return description;
}
