import { RunService } from "@rbxts/services";
import { t } from "@rbxts/t";
import type { PlayerComponent } from "server/components/player-component";
import { OnlyClient } from "shared/decorators/method/only-client";
import { OnlyServer } from "shared/decorators/method/only-server";
import { ClientFunctions } from "shared/network";
import { FailedProcessAction, GetClassName } from "shared/utilities/function-utilities";
import { IAction } from "types/IAction";
import { ServerResponse, ServerResponseError } from "types/server-response";

type IsEmptyObject<T> = T extends Record<string, never> ? true : false;

export abstract class Action<D extends object = {}, R = undefined> implements IAction<D> {
	public readonly Name: string;
	public readonly Data: D;
	protected playerComponent!: PlayerComponent;
	protected abstract readonly validator: t.check<D>;

	/**
	 * @hidden
	 */
	public validate() {
		return this.validator(this.Data);
	}

	protected abstract doAction(): ServerResponse<R>;

	/**
	 * @server
	 */
	@OnlyServer
	public SetPlayerComponent(playerComponent: PlayerComponent) {
		this.playerComponent = playerComponent;
	}

	/**
	 * @server
	 */
	@OnlyServer
	public DoAction(): ServerResponse<R> {
		assert(this.playerComponent, "Invalid player component");
		return this.doAction();
	}

	/**
	 * @client
	 */
	@OnlyClient
	public Send() {
		if (!RunService.IsRunning()) {
			return new Promise<ServerResponseError>((resolve) =>
				resolve(FailedProcessAction("Cannot send action in studio")),
			);
		}
		return ClientFunctions.DoAction({
			Name: this.Name,
			Data: this.Data,
		}) as Promise<ServerResponse<R>>;
	}

	constructor(data: IsEmptyObject<D> extends true ? void : D) {
		this.Name = GetClassName(this);
		this.Data = (data as D) ?? ({} as D);
	}
}
