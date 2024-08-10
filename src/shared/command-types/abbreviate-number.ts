import { Flamework } from "@flamework/core";
import { TransformResult, TypeBuilder } from "@rbxts/commander";
import { CustomCommanderType } from ".";
import { RegisteryCommandType } from "./registery-type";
import { AbbreviateString } from "shared/utilities/abbreviate-numbers";

const suggestions = ["50", "100", "500", "1K", "1M"];

RegisteryCommandType(
	TypeBuilder.create<number>(CustomCommanderType.AbbreviateNumber)
		.validate(Flamework.createGuard())
		.transform((text) => {
			const [success, number] = pcall(() => AbbreviateString(text));
			if (!success) return TransformResult.err("Invalid number");

			return TransformResult.ok(number);
		})
		.suggestions(() => suggestions)
		.build(),
);
