import { Dependency } from "@flamework/core";
import { IS_CLIENT } from "./constants";
import type { PlayerController } from "client/controllers/player-controller";

type ClientRootProducer = ReturnType<typeof Dependency<PlayerController>>["RootProducer"];
let rootProducer: ClientRootProducer | undefined = undefined;

export const GetClientRootProducer = () => {
	assert(IS_CLIENT, "GetClientRootProducer can only be used on the client");
	rootProducer = (_G.ROOT_PRODUCER as ClientRootProducer) ?? Dependency<PlayerController>().RootProducer;
	return rootProducer;
};
