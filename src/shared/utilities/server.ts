import { IS_CLIENT, IS_SERVER } from "./constants";

export const GetServerRootProducer = () => {
	assert(IS_SERVER, "GetServerRootProducer can only be used on the server");
	return import("server/store").expect().RootProducer;
};
