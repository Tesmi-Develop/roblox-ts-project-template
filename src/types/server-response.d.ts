interface IServerResponse<B extends boolean, T> {
	success: B;
	message: T;
}

export type ServerResponseError = IServerResponse<false, string>;
export type ServerResponse<T = undefined> = IServerResponse<true, T> | ServerResponseError;
