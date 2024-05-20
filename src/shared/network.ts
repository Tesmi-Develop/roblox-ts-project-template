import { Networking } from "@flamework/networking";
import { IAction } from "types/IAction";

interface ClientToServerEvents {
	StartReplication: () => void;
}

interface ServerToClientEvents {
	Dispatch(
		actions: {
			buffer: buffer;
			blobs: defined[];
		},
		typeDispatch: "playerData" | "global",
	): void;
}

interface ClientToServerFunctions {
	DoAction(action: IAction): unknown;
}

interface ServerToClientFunctions {}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();

export const ClientEvents = GlobalEvents.createClient({});
export const ClientFunctions = GlobalFunctions.createClient({});
