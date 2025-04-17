/* eslint-disable no-empty */
/* eslint-disable roblox-ts/no-array-pairs */
import { Flamework, Modding, Reflect } from "@flamework/core";
import { Constructor } from "@flamework/core/out/utility";
import { GetInjectTypes } from "shared/decorators/field/Inject-type";
import { GetPlaceName, IS_ENABLED_MULTIPLE_PLACES, PlaceNames } from "shared/places";
import { IS_STUDIO } from "shared/utilities/constants";
import { ModifyConstructorMethod } from "shared/utilities/function-utilities";
import { getDeferredConstructor } from "shared/utilities/object-utilities";
import { VoidCallback } from "types/utility";
import("@flamework/components").expect();

const casted = Flamework as unknown as { resolveDependency: (spec: string) => unknown };
const castedModding = Modding as unknown as {
	createDeferredDependency: (ctor: Constructor, options: {}) => [{}, VoidCallback];
	resolveDependency: (ctor: Constructor, dependencyId: string, index: number, options: {}) => unknown;
};
const castedReflect = Reflect as unknown as { idToObj: Map<string, object> };

const orig = casted.resolveDependency;
const multiplaceObjects = new Map<string, PlaceNames[]>(); // Stored objects that have a specific list of places in which they can work
export const METADATA_MULTIPLE_PLACES = "multiple-places";

casted.resolveDependency = (spec) => {
	assert(IsCanUseObject(spec), `Object ${spec} can't be used in place ${GetPlaceName()}`);
	return orig(spec);
};

export function ResolveDepedency(ctor: Constructor, spec: string, options = {}, index = 0) {
	try {
		return castedModding.resolveDependency(ctor, spec, index, options);
	} catch (e) {}
}

function InjectTypes(types: Map<string, string>, ctor: Constructor, options: {}, instance: object) {
	types.forEach((specType, fieldName) => {
		assert(IsCanUseObject(specType), `Object ${specType} can't be used in place ${GetPlaceName()}`);
		instance[fieldName as never] = ResolveDepedency(ctor, specType, options) as never;
	});
}

function resolveInjecting(ctor: Constructor) {
	const injectedTypes = GetInjectTypes(ctor);
	if (!injectedTypes) return;

	ModifyConstructorMethod(
		ctor,
		"constructor",
		(originalConstructor) =>
			function (this, ...args) {
				const opts = Reflect.getOwnMetadata<{}>(ctor, "flamework:dependency_resolution");
				InjectTypes(injectedTypes, ctor, opts ?? {}, this);

				return originalConstructor(this, ...args);
			},
	);
}

export function IsCanUseObject(spec: string) {
	const places = multiplaceObjects.get(spec);
	if (!places) return true;

	return places.includes(GetPlaceName());
}

export const AddMultiplaceObject = (id: string, places: PlaceNames[] | PlaceNames) => {
	const currentPlaces = multiplaceObjects.get(id) ?? [];
	multiplaceObjects.set(id, currentPlaces);

	const content = typeIs(places, "string") ? [places] : places;
	content.forEach((v) => currentPlaces.push(v));

	const object = Modding.getObjectFromId(id);
	assert(object, "Object not found");
	Reflect.defineMetadata(object, METADATA_MULTIPLE_PLACES, currentPlaces);
};

interface DependencyResolutionOptions {
	/**
	 * Fires whenever a dependency is attempting to be resolved.
	 *
	 * Return undefined to let Flamework resolve it.
	 */
	handle?: (id: string, index: number) => unknown;

	/**
	 * Fires whenever Flamework tries to resolve a primitive (e.g string)
	 */
	handlePrimitive?: (id: string, index: number) => defined;
}

export function Instantiate<T extends Constructor>(
	ctor: T,
	args: ConstructorParameters<T>,
	options: DependencyResolutionOptions = {},
) {
	const [obj, construct] = getDeferredConstructor(ctor);
	const injectedTypes = GetInjectTypes(ctor);

	if (injectedTypes) {
		InjectTypes(injectedTypes, ctor, options, obj as {});
	}
	construct(...args);

	return obj as T extends new (...args: never[]) => infer R ? R : never;
}

function IsComponent(object: object) {
	const castedReflect2 = Reflect as unknown as { decorators: Map<string, object[]> };
	const components = castedReflect2.decorators.get("$c:components@Component")!;
	if (!components) return false;

	const index = components.indexOf(object);
	return index !== -1;
}

const resolveMultiplaceObject = (id: string) => {
	const casted = Reflect as unknown as { decorators: Map<string, object[]> };
	const components = casted.decorators.get("$c:components@Component")!;
	const object = Modding.getObjectFromId(id);
	const places = multiplaceObjects.get(id);

	if (!places || !object) return;
	if (places.includes(GetPlaceName())) return;

	Reflect.deleteMetadata(object, "flamework:singleton");
	Reflect.deleteMetadata(object, "$c:components@Component");
	const index = components.indexOf(object);
	index !== -1 && components.remove(index);
};

function IsSigleton(ctor: object) {
	if (IS_STUDIO)
		return (
			Reflect.getMetadata<boolean>(ctor, "flamework:decorators.$:flamework@Service") !== undefined ||
			Reflect.getMetadata<boolean>(ctor, "flamework:decorators.$:flamework@Controller") !== undefined
		);

	return Reflect.getMetadata<boolean>(ctor, "flamework:singleton") !== undefined;
}

export const StartFlameworkUtils = () => {
	for (const [id, ctor] of castedReflect.idToObj) {
		IS_ENABLED_MULTIPLE_PLACES && resolveMultiplaceObject(id);

		if (!IsSigleton(ctor) && !IsComponent(ctor)) continue;
		if (Reflect.getMetadata<boolean>(ctor, "flamework:optional")) continue;

		resolveInjecting(ctor as Constructor);
	}
};
