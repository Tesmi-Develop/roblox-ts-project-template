import { Networking } from "@flamework/networking";
import { Atom } from "@rbxts/charm";
import { createBinarySerializer } from "@rbxts/flamework-binary-serializer";
import { IAction } from "types/IAction";
import { PlayerData } from "./schemas/player-data-types";
import { GameData } from "./schemas/game-data-types";

interface ClientToServerEvents {
	StartReplication: () => void;
}

interface ServerToClientEvents {
	Dispatch(payload: {}): void;
}

interface ClientToServerFunctions {
	DoAction(action: { buffer: buffer; blobs: defined[] }): unknown;
}

interface ServerToClientFunctions {}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();

export const ClientEvents = GlobalEvents.createClient({});
export const ClientFunctions = GlobalFunctions.createClient({});

export const ActionSerializer = createBinarySerializer<Omit<IAction, "Data"> & { Data: unknown }>();

export type PlayerAtoms = {
	playerData: Atom<PlayerData>;
	gameData: Atom<GameData>;
};
