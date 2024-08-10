/// <reference types="@rbxts/testez/globals" />

import { Reflect } from "@flamework/core";
import { CreateTestPlayer } from "server/utility-for-tests";
import { RUN_TEST_KEY } from "shared/decorators/method/run-test";
import { CallMethod, GetClassName } from "shared/utilities/function-utilities";

export = () => {
	const player = CreateTestPlayer().expect();

	describe("Testing player modules", () => {
		player.GetModules().forEach((module) => {
			const runTests = Reflect.getMetadata<string[]>(module, RUN_TEST_KEY);
			if (!runTests) return;

			describe(`Testing ${GetClassName(module)}`, () => {
				runTests.forEach((methodName) => {
					it(`Should complete ${methodName}`, (context) =>
						CallMethod(module[methodName as keyof typeof module], module as never, ...([expect] as never)));
				});
			});
		});
	});

	afterAll(() => player.destroy());
};
