import { Controller, Flamework, Reflect, Service } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";

/** @metadata reflect identifier flamework:implements */
export const SharedSingleton = (config?: Flamework.ServiceConfig | Flamework.ControllerConfig) => {
	return (ctor: Constructor) => {
		Reflect.decorate(ctor, "$:flamework@Service", Service, [config]);
		Reflect.decorate(ctor, "$:flamework@Controller", Controller, [config]);
	};
};
