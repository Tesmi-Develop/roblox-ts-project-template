import { Dependency, Modding } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
import { GetIdentifier, getDeferredConstructor } from "./object-utilities";
import { GetInjectTypes } from "shared/decorators/field/Inject-type";
import { ResolveDepedency } from "shared/flamework-utils";
import { VoidCallback } from "types/utility";
import { GetClassName } from "./function-utilities";

export class DependenciesContainer {
	private factories = new Map<string, () => unknown>();
	private instances = new Map<object, object>();

	constructor(private useDIFlamework = false) {}

	private wrapConstructorInFactory(ctor: Constructor) {
		return () => {
			if (this.instances.has(ctor)) {
				return this.instances.get(ctor)!;
			}

			const instance = this.Instantiate(ctor);
			this.instances.set(ctor, instance);

			return instance;
		};
	}

	/** @metadata macro */
	public Register<T extends object>(ctor: Constructor<T>, spec?: Modding.Intrinsic<"symbol-id", [T], string>): void;
	/** @metadata macro */
	public Register<T>(factory: () => T, spec?: Modding.Intrinsic<"symbol-id", [T], string>): void;
	public Register<T>(factoryOrCtor: (() => T) | Constructor<T>, spec?: Modding.Intrinsic<"symbol-id", [T], string>) {
		assert(spec);

		const factory = typeIs(factoryOrCtor, "function")
			? factoryOrCtor
			: this.wrapConstructorInFactory(factoryOrCtor as never);

		this.factories.set(`${spec}`, factory);
	}

	/** @metadata macro */
	public Unregister<T>(spec?: Modding.Generic<T, "id">) {
		assert(spec);
		this.factories.delete(spec);
	}

	private resolveFromDIFlamework(spec: string, ctor?: Constructor) {
		return !ctor ? Dependency(spec as never) : ResolveDepedency(ctor, spec);
	}

	private resolve(spec: string, ctor?: Constructor) {
		let result = this.factories.get(spec)?.();
		if (!result && this.useDIFlamework) {
			result = this.resolveFromDIFlamework(spec, ctor);
		}
		assert(result, `No factory for ${spec}`);

		return result;
	}

	/** @metadata macro */
	public Resolve<T>(spec?: Modding.Generic<T, "id">) {
		return this.resolve(spec as never);
	}

	public Inject(instance: object, handle?: (injecting: unknown) => void) {
		const injectedTypes = GetInjectTypes(instance);
		if (!injectedTypes) return;

		injectedTypes.forEach((specType, fieldName) => {
			const injectedType = this.resolve(specType as never, getmetatable(instance) as never) as never;
			handle?.(injectedType);

			instance[fieldName as never] = injectedType;
		});
	}

	public Instantiate<T extends object>(ctor: Constructor<T>, ...args: ConstructorParameters<Constructor<T>>) {
		const [instance, construct] = getDeferredConstructor<T>(ctor);

		this.Inject(instance as object);
		construct(...args);

		return instance as T;
	}

	public InstantiateGroup<T extends Constructor<T>>(ctors: T[], isRegister = false) {
		const injects: VoidCallback[] = [];
		const constructructs: VoidCallback[] = [];
		const instances: InstanceType<T>[] = [];

		ctors.forEach((ctor) => {
			const [instance, construct, inject] = this.InstantiateWithoutConstruct(ctor);
			instances.push(instance as never);
			injects.push(inject);
			constructructs.push(construct);
		});

		if (isRegister) {
			instances.forEach((instance) => {
				const id = GetIdentifier(instance as never);
				assert(id, `No identifier for ${GetClassName(instance)}`);
				this.Register(() => instance, id as never);
			});
		}

		injects.forEach((inject) => inject());
		constructructs.forEach((construct) => construct());

		return instances;
	}

	public InstantiateWithoutConstruct<T extends object>(ctor: Constructor<T>) {
		const [instance, construct] = getDeferredConstructor<T>(ctor);

		return [instance as T, construct, () => this.Inject(instance as object)] as const;
	}

	public Clear() {
		this.factories.clear();
		this.instances.clear();
	}
}
