import { Modding } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
import { RunService } from "@rbxts/services";
import { DependenciesContainer } from "./utilities/dependencies-container";
import { Event } from "./utilities/event";
import { CreateIdGenerator } from "./utilities/function-utilities";
import { GetIdentifier } from "./utilities/object-utilities";
import Signal from "@rbxts/rbx-better-signal";

export abstract class BaseEffect {
	public onStopped = new Event();
	protected isSingled = false;
	private updateConnection?: RBXScriptConnection;

	constructor(protected time?: number) {}

	public IsSingle() {
		return this.isSingled;
	}

	public AddTime(time: number) {
		if (this.time === undefined) return;
		this.time += time;
	}

	/**
	 * If this effect is applied to a character multiple times, this function is called when the existing effect is stacked.
	 * Returning false will cancel the stacking of the effect.
	 * @param otherEffect The existing effect of the same type.
	 * @returns Whether the current effect should be destroyed.
	 */
	public OnStack(otherEffect: this) {
		return true;
	}

	public OnStart() {
		if (this.time) {
			this.updateConnection = RunService.Heartbeat.Connect((dt) => {
				if (this.time! < 0) {
					this.OnStop();
					return;
				}
				this.time! -= dt;
			});
		}

		this.onStart();
	}

	public OnStop() {
		this.updateConnection?.Disconnect();
		this.onStopped.Fire();
		this.onStopped.Destroy();
		this.onStop();
	}

	protected abstract onStart(): void;
	protected abstract onStop(): void;
}

export class EffectController {
	public readonly OnAdded = new Signal<(effect: BaseEffect) => void>();
	private nextId = CreateIdGenerator(true);
	private effects = new Map<string, BaseEffect>();

	constructor(private dependencyContainer?: DependenciesContainer) {}

	/** @metadata macro */
	public AddEffect<T extends BaseEffect>(
		onConstruct?: (effect: T) => void,
		delay?: number,
		id?: Modding.Generic<T, "id">,
	) {
		assert(id);

		const [effectId, effect] = this.GetFirstEffect(id) ?? [];
		if (effectId && effect!.IsSingle()) return () => this.RemoveEffectById(effectId);

		const ctor = Modding.getObjectFromId(id) as Constructor<T>;
		const nextid = this.nextId();
		const instance = this.dependencyContainer
			? this.dependencyContainer.Instantiate(ctor, delay as never)
			: new ctor(delay as never);
		onConstruct?.(instance);

		if (effectId && effect && effect.OnStack(instance)) {
			this.RemoveEffectById(effectId!);
		}

		instance.onStopped.Connect(() => {
			this.effects.delete(nextid);
		});

		this.effects.set(nextid, instance);
		instance.OnStart();
		this.OnAdded.Fire(instance);

		return () => this.RemoveEffectById(nextid);
	}

	/** @metadata macro */
	public AddTempraryEffect<T extends BaseEffect>(
		delay: number,
		onConstruct?: (effect: T) => void,
		id?: Modding.Generic<T, "id">,
	) {
		assert(id);

		return this.AddEffect(onConstruct, delay, id);
	}

	/** @metadata macro */
	public GetEffects<T extends BaseEffect>(id?: Modding.Generic<T, "id">) {
		assert(id);

		const result = new Map<string, BaseEffect>();

		this.effects.forEach((value, id) => {
			const effectId = GetIdentifier(value);
			if (effectId !== id) return;

			result.set(id, value);
		});

		return result;
	}

	/** @metadata macro */
	public HaveEffect<T extends BaseEffect>(id?: Modding.Generic<T, "id">) {
		assert(id);

		for (const [_, effect] of this.effects) {
			const effectId = GetIdentifier(effect);
			if (effectId !== id) return;
			return true;
		}

		return false;
	}

	/** @metadata macro */
	public GetFirstEffect<T extends BaseEffect>(id?: Modding.Generic<T, "id">) {
		assert(id);

		for (const [_, effect] of this.effects) {
			const effectId = GetIdentifier(effect);
			if (effectId !== id) return;
			return [id, effect] as const;
		}

		return;
	}

	/** @metadata macro */
	public RemoveEffects<T extends BaseEffect>(id?: Modding.Generic<T, "id">) {
		const effects = this.GetEffects(id);
		for (const [id, effect] of effects) {
			effect.OnStop();
			this.effects.delete(id);
		}
	}

	public RemoveEffectById(id: string) {
		const effect = this.effects.get(id);
		if (!effect) return;

		effect.OnStop();
		this.effects.delete(id);
	}

	public Destroy() {
		this.effects.forEach((effect) => {
			effect.OnStop();
		});

		this.effects.clear();
	}
}
