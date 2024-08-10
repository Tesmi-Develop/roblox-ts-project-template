/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArgumentType } from "@rbxts/commander";

export const CommandTypes: ArgumentType<any>[] = [];

export function RegisteryCommandType(arg: ArgumentType<any>) {
	CommandTypes.push(arg);
}
