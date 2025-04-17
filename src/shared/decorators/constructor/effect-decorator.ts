import { Constructor } from "@flamework/core/out/utility";
import { BaseEffect } from "shared/effect-controller";

export const Effects = new Map<string, Constructor<BaseEffect>>();

/** @metadata reflect identifier */
export function EffectDecorator(ctor: Constructor<BaseEffect>) {
	Effects.set(tostring(ctor), ctor);
}
