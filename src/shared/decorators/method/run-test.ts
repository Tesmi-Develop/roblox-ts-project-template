/* eslint-disable @typescript-eslint/no-explicit-any */
import { Reflect } from "@flamework/core";

export const RUN_TEST_KEY = "runTest";

export const RunTest = (
	constructor: object,
	propertyName: string,
	descriptor: TypedPropertyDescriptor<(test: typeof expect) => any>,
) => {
	const runTests = Reflect.getMetadata<string[]>(constructor, RUN_TEST_KEY) ?? [];
	Reflect.defineMetadata(constructor, RUN_TEST_KEY, runTests);

	runTests.push(propertyName);
};

export type Expect = typeof expect;
