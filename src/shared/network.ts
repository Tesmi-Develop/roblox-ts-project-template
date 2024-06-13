import { Networking } from "@flamework/networking";
import { Atom } from "@rbxts/charm";
import { createBinarySerializer } from "@rbxts/flamework-binary-serializer";
import { IAction } from "types/IAction";
import { GameData } from "./schemas/game-data";
import { PlayerData } from "./schemas/player-data-types";

interface ClientToServerEvents {
	StartReplication: () => void;
}

interface ServerToClientEvents {
	Dispatch(payload: { buffer: buffer; blobs: defined[] }): void;
}

interface ClientToServerFunctions {
	DoAction(action: { buffer: buffer; blobs: defined[] }): unknown;
}

interface ServerToClientFunctions {}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();

export const ClientEvents = GlobalEvents.createClient({});
export const ClientFunctions = GlobalFunctions.createClient({});

export const DispatchSerializer =
	createBinarySerializer<{ type: "init" | "patch"; data: Record<keyof SyncerType, unknown> }>();
export const ActionSerializer = createBinarySerializer<Omit<IAction, "Data"> & { Data: unknown }>();

export type SyncerType = {
	playerData: Atom<PlayerData>;
	gameData: Atom<GameData>;
};
