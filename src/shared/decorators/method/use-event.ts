import { ServerReceiver, ClientReceiver } from "@flamework/networking/out/events/types";
import { ModifyConstructorMethod } from "shared/utilities/function-utilities";

type FlameworkEvent<T extends defined[] = defined[]> = ServerReceiver<T> | ClientReceiver<T>;

type ReturnMethods<T extends object> = ExtractKeys<T, Callback>;
type InferEventArgs<T> = T extends RBXScriptSignal<infer C>
	? Parameters<C>
	: T extends FlameworkEvent<infer A>
	? A
	: never;

const connections = new Map<object, RBXScriptConnection[]>();

const addConnection = (target: object, connection: RBXScriptConnection) => {
	const connectionsForTarget = connections.get(target) ?? [];
	connectionsForTarget.push(connection);
	connections.set(target, connectionsForTarget);
};

const removeConnections = (target: object) => {
	connections.get(target)?.forEach((connection) => connection.Disconnect());
	connections.delete(target);
};

export const UseEvent = <T extends object, E extends FlameworkEvent | RBXScriptSignal>(
	event: E,
	cleanupMethodName?: ReturnMethods<T>,
) => {
	return (
		target: T,
		propertyName: string,
		descriptor: TypedPropertyDescriptor<(this: T, ...args: InferEventArgs<E>) => void>,
	) => {
		const isFlameworkEvent = "connect" in event;

		ModifyConstructorMethod(
			target as never,
			"constructor",
			(originalConstructor) =>
				function (this, ...args) {
					const fire = (...eventArgs: InferEventArgs<E>) => descriptor.value(this, ...(eventArgs as never));
					addConnection(this, isFlameworkEvent ? event.connect(fire as never) : event.Connect(fire));

					return originalConstructor(this, ...args);
				},
		);

		if (cleanupMethodName) {
			ModifyConstructorMethod(target as never, cleanupMethodName as never, (originalMethod) => {
				return function (this, ...args: unknown[]) {
					removeConnections(this);

					return originalMethod(this, ...args);
				};
			});
		}
	};
};
