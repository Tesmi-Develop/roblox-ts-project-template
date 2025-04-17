/* eslint-disable @typescript-eslint/no-explicit-any */
import { Modding, Reflect } from "@flamework/core";
import Signal from "@rbxts/rbx-better-signal";
import { RunService } from "@rbxts/services";
import { t } from "@rbxts/t";
import type { PlayerComponent } from "server/components/player-component";
import { ACTION_GUARD_KEY, Actions } from "shared/decorators/constructor/action-decorator";
import { OnlyClient } from "shared/decorators/method/only-client";
import { OnlyServer } from "shared/decorators/method/only-server";
import { ActionSerializer, ClientFunctions } from "shared/network";
import { IS_CLIENT, LocalPlayer } from "shared/utilities/constants";
import { FailedProcessAction, GetClassName, SuccessProcessAction } from "shared/utilities/function-utilities";
import { IAction } from "types/IAction";
import { ServerResponse } from "types/server-response";

type IsEmptyObject<T> = T extends Record<string, never> ? true : false;

const MESSAGE_WHEN_HAVE_COOLDOWN = "You're sending too many actions!";
const CODE_WHEN_HAVE_COOLDOWN = 2;

type InferActionResponse<A extends Action<any, any>> = A extends Action<any, infer R> ? R : never;

type SendActionParams<A extends Action<any, any>> =
	IsEmptyObject<A["Data"]> extends true
		? [void, actionIndefier?: Modding.Generic<A, "id">]
		: [data: A["Data"], actionIndefier?: Modding.Generic<A, "id">];
/**
 * @client
 * @metadata macro
 */
export function SendAction<A extends Action<any, any>>(...args: SendActionParams<A>) {
	const [data, actionIndefier] = args as [unknown, Modding.Generic<A, "id">?];
	assert(actionIndefier);

	return Actions.get(actionIndefier)!.Send(data) as Promise<ServerResponse<InferActionResponse<A>>>;
}

export abstract class Action<D extends object = {}, R = undefined> implements IAction<D> {
	/**
	 * @client
	 * @metadata macro
	 */
	public static Get<T extends Action<any, any>>(actionIndefier?: Modding.Generic<T, "id">): T {
		assert(actionIndefier);
		return Actions.get(actionIndefier) as T;
	}

	private static Cooldowns = new Map<string, Set<Player>>();
	private static actionInProcessing = new Map<string, Set<string>>();
	public static OnGotResponse = new Signal<(action: Action<any, any>, response: ServerResponse<unknown>) => void>();
	public readonly Name: string;
	public readonly Data: D;
	public IsSingleUse = false;
	protected Cooldown = 0;
	protected playerComponent!: PlayerComponent;

	/**
	 * @hidden
	 */
	public validate() {
		const guard = Reflect.getMetadata<t.check<D>>(getmetatable(this) as object, ACTION_GUARD_KEY);
		assert(guard, "Invalid guard");

		return guard(this.Data);
	}

	protected abstract doAction(playerComponent: PlayerComponent): ServerResponse<R> | Promise<ServerResponse<R>>;

	/**
	 * @server
	 */
	@OnlyServer
	public SetPlayerComponent(playerComponent: PlayerComponent) {
		this.playerComponent = playerComponent;
	}

	private haveCooldown() {
		return (
			Action.Cooldowns.get(GetClassName(this))?.has(IS_CLIENT ? LocalPlayer : this.playerComponent.instance) ??
			false
		);
	}

	private giveCooldown() {
		if (this.Cooldown === 0) return;

		const cooldowns = Action.Cooldowns.get(GetClassName(this)) ?? new Set<Player>();
		cooldowns.add(IS_CLIENT ? LocalPlayer : this.playerComponent.instance);
		Action.Cooldowns.set(GetClassName(this), cooldowns);

		Promise.delay(this.Cooldown).then(() =>
			cooldowns.delete(IS_CLIENT ? LocalPlayer : this.playerComponent.instance),
		);
	}

	private giveActionDebounce() {
		const playerName = IS_CLIENT ? LocalPlayer.Name : this.playerComponent.Name;
		const actionsInProcessing = Action.actionInProcessing.get(playerName) ?? new Set<string>();

		Action.actionInProcessing.set(playerName, actionsInProcessing);
		actionsInProcessing.add(this.Name);

		return () => actionsInProcessing.delete(this.Name);
	}

	private haveActionDebounce() {
		const playerName = IS_CLIENT ? LocalPlayer.Name : this.playerComponent.Name;
		return Action.actionInProcessing.get(playerName)?.has(this.Name) ?? false;
	}

	/** @server */
	@OnlyServer
	public DoAction(): ServerResponse<R> | Promise<ServerResponse<R>> {
		assert(this.playerComponent, "Invalid player component");

		if (this.haveCooldown()) {
			return FailedProcessAction(MESSAGE_WHEN_HAVE_COOLDOWN, CODE_WHEN_HAVE_COOLDOWN);
		}

		if (this.IsSingleUse && this.haveActionDebounce()) {
			return FailedProcessAction("Action in processing");
		}

		const removeDebounce = this.giveActionDebounce();
		const result = this.doAction(this.playerComponent);
		this.giveCooldown();

		if (!Promise.is(result)) {
			removeDebounce();
			return result;
		}

		return result.then((result) => {
			removeDebounce();
			return result;
		});
	}

	/** @client */
	@OnlyClient
	public async Send(data: IsEmptyObject<D> extends true ? void : D) {
		if (!RunService.IsRunning()) {
			return FailedProcessAction("Cannot send action in studio", CODE_WHEN_HAVE_COOLDOWN);
		}

		if (this.haveCooldown()) {
			return FailedProcessAction(MESSAGE_WHEN_HAVE_COOLDOWN);
		}

		if (this.IsSingleUse && this.haveActionDebounce()) {
			return FailedProcessAction("Action in processing");
		}

		this.giveCooldown();
		const removeDebounce = this.giveActionDebounce();

		const response = (await ClientFunctions.DoAction(
			ActionSerializer.serialize({
				Name: this.Name,
				Data: data ?? {},
			}),
		)) as ServerResponse<R>;

		removeDebounce();
		Action.OnGotResponse.Fire(this, response);

		return response;
	}

	constructor(data: IsEmptyObject<D> extends true ? void : D) {
		this.Name = GetClassName(this);
		this.Data = (data as D) ?? ({} as D);
	}
}

export function WrapMessage(message?: string) {
	return message !== undefined ? FailedProcessAction(message) : SuccessProcessAction();
}
