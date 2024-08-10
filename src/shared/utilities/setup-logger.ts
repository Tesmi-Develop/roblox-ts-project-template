import Log, { LogEvent, LogLevel, Logger } from "@rbxts/log";
import { IS_CLIENT, IS_DEV } from "./constants";
import { ILogEventSink } from "@rbxts/log/out/Core";
import { PlainTextMessageTemplateRenderer, MessageTemplateParser } from "@rbxts/message-templates";

const LOG_LEVEL = IS_DEV ? LogLevel.Debugging : LogLevel.Information;
const Environment = IS_CLIENT ? "Client" : "Server";

const STACK_TRACE_LEVEL_MODULE = 5;
const STACK_TRACE_LEVEL_FLAMEWORK = 4;

/**
 * Represents a log event sink that outputs log messages using the Roblox
 * logging functions.
 */
class LogEventSFTOutputSink implements ILogEventSink {
	public Emit(message: LogEvent): void {
		const template = new PlainTextMessageTemplateRenderer(MessageTemplateParser.GetTokens(message.Template));

		const tag = this.getLogLevelString(message.Level);
		const context = message.SourceContext ?? "Game";
		const messageResult = template.Render(message);
		const fileInfo = this.getFileInformation(context);

		const formattedMessage = `[${tag}] ${context} (${Environment}) - ${messageResult}` + fileInfo;

		if (message.Level >= LogLevel.Fatal) {
			error(formattedMessage);
		} else if (message.Level >= LogLevel.Warning) {
			warn(formattedMessage);
		} else {
			print(formattedMessage);
		}
	}

	private getLogLevelString(level: LogLevel): string {
		switch (level) {
			case LogLevel.Verbose: {
				return "VERBOSE";
			}
			case LogLevel.Debugging: {
				return "DEBUG";
			}
			case LogLevel.Information: {
				return "INFO";
			}
			case LogLevel.Warning: {
				return "WARN";
			}
			case LogLevel.Error: {
				return "ERROR";
			}
			case LogLevel.Fatal: {
				return "FATAL";
			}
		}
	}

	private getFileInformation(context: string): string {
		if (LOG_LEVEL > LogLevel.Verbose) {
			return "";
		}

		const source =
			context === "Game"
				? debug.info(STACK_TRACE_LEVEL_MODULE, "sl")
				: debug.info(STACK_TRACE_LEVEL_FLAMEWORK, "sl");
		const [file, line] = source;
		return ` (${file}:${line})`;
	}
}

let logger: Logger;

export function SetupLogger() {
	if (logger) return;
	logger = Logger.configure().WriteTo(new LogEventSFTOutputSink()).SetMinLogLevel(LOG_LEVEL).Create();
	Log.SetLogger(logger);
}

export function GetLogger() {
	SetupLogger();
	return logger;
}
