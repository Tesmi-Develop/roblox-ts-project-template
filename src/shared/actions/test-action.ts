import { Logger } from "@rbxts/log";
import { ActionDecorator } from "shared/decorators/constructor/action-decorator";
import { SuccessProcessAction } from "shared/utilities/function-utilities";
import { Action } from "./action";

@ActionDecorator()
export class TestAction extends Action<{ code: string }, void> {
	private logger!: Logger;

	protected doAction() {
		this.logger.Debug("TestAction: doAction", this.Data);
		return SuccessProcessAction();
	}
}
