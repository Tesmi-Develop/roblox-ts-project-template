import { CenturionType, Command, CommandContext, Register } from "@rbxts/centurion";

@Register()
class EchoCommand {
	@Command({
		name: "echo",
		description: "Displays text",
		arguments: [
			{
				name: "text",
				description: "The text to display",
				type: CenturionType.String,
			},
		],
	})
	echo(ctx: CommandContext, text: string) {
		ctx.reply(text);
	}
}
