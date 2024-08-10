import { Modding, Reflect } from "@flamework/core";
import { t } from "@rbxts/t";

export const INJECT_TYPE_KEY = "Inject-type";
export const ObjectWithInjectTypes = new Map<string, object[]>(); // typeId -> [object]

/**
 * Inject dependency.
 *
 * @metadata flamework:type
 */
export const InjectType = Modding.createDecorator<[]>("Property", (descriptor) => {
	const typeSpecifier = Reflect.getMetadata<string>(descriptor.object, "flamework:type", descriptor.property);

	if (typeSpecifier === undefined) {
		throw "Injected type not found";
	}

	Reflect.defineMetadata(descriptor.object, descriptor.property, typeSpecifier, INJECT_TYPE_KEY);
});

export const GetInjectTypes = (obj: {}) => {
	const injectProperties = Reflect.getMetadataKeys(obj, INJECT_TYPE_KEY);
	const injectTypes = new Map<string, string>();

	injectProperties.forEach((prop) => {
		const typeSpec = Reflect.getMetadata<string>(obj, prop, INJECT_TYPE_KEY);
		assert(typeSpec !== undefined, `Injected type not found for ${prop}`);
		injectTypes.set(prop, typeSpec);
	});

	assert(t.map(t.string, t.string)(injectTypes), "Invalid inject types");
	return injectTypes;
};
