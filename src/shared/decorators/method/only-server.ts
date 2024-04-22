import { RunService } from "@rbxts/services";

export function OnlyServer(object: object, propertyName: string, description: TypedPropertyDescriptor<Callback>) {
	const method = description.value;

	description.value = function (this, ...args: unknown[]) {
		assert(RunService.IsServer(), `Method ${propertyName} can't be casted on client.`);
		return method(this, ...args);
	};

	return description;
}
