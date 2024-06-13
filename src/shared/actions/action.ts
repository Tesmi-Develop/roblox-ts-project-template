import { RunService } from "@rbxts/services";
import { t } from "@rbxts/t";
import type { PlayerComponent } from "server/components/player-component";
import { OnlyClient } from "shared/decorators/method/only-client";
import { OnlyServer } from "shared/decorators/method/only-server";
import { ActionSerializer, ClientFunctions } from "shared/network";
import { FailedProcessAction, GetClassName } from "shared/utilities/function-utilities";
import { IAction } from "types/IAction";
import { ServerResponse, ServerResponseError } from "types/server-response";

type IsEmptyObject<T> = T extends Record<string, never> ? true : false;

export abstract class Action<D extends object = {}, R = undefined> implements IAction<D> {
	private static Cooldowns = new Map<string, Set<Player>>();
	public readonly Name: string;
	public readonly Data: D;
	protected Cooldown = 0;
	protected playerComponent!: PlayerComponent;
	protected abstract readonly validator: t.check<D>;

	/**
	 * @hidden
	 */
	public validate() {
		return this.validator(this.Data);
	}

	protected abstract doAction(playerComponent: PlayerComponent): ServerResponse<R>;

	/**
	 * @server
	 */
	@OnlyServer
	public SetPlayerComponent(playerComponent: PlayerComponent) {
		this.playerComponent = playerComponent;
	}

	private haveCooldown() {
		return Action.Cooldowns.get(GetClassName(this))?.has(this.playerComponent.instance) ?? false;
	}

	private giveCooldown() {
		if (this.Cooldown === 0) return;

		const cooldowns = Action.Cooldowns.get(GetClassName(this)) ?? new Set<Player>();
		cooldowns.add(this.playerComponent.instance);
		Action.Cooldowns.set(GetClassName(this), cooldowns);

		task.delay(this.Cooldown, () => cooldowns.delete(this.playerComponent.instance));
	}

	/**
	 * @server
	 */
	@OnlyServer
	public DoAction(): ServerResponse<R> {
		assert(this.playerComponent, "Invalid player component");
		if (this.haveCooldown()) {
			return FailedProcessAction("You're sending too many actions!");
		}
		const result = this.doAction(this.playerComponent);
		this.giveCooldown();
		return result;
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
		return ClientFunctions.DoAction(
			ActionSerializer.serialize({
				Name: this.Name,
				Data: this.Data,
			}),
		) as Promise<ServerResponse<R>>;
	}

	constructor(data: IsEmptyObject<D> extends true ? void : D) {
		this.Name = GetClassName(this);
		this.Data = (data as D) ?? ({} as D);
	}
}
