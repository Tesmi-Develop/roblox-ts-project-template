import type { PlayerComponent } from "server/components/player-component";
import { Action } from "./action";
import { Flamework } from "@flamework/core";
import { SuccessProcessAction } from "shared/utilities/function-utilities";
import { ActionDecorator } from "shared/decorators/constructor/action-decorator";

@ActionDecorator
export class TestAction extends Action<{ someNumber: number }, void> {
	protected validator = Flamework.createGuard<typeof this.Data>();

	protected doAction() {
		print(`TestAction: ${this.Data.someNumber}`);
		return SuccessProcessAction();
	}
}
