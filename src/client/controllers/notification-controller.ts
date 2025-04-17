import { Controller, OnStart } from "@flamework/core";
import { Logger } from "@rbxts/log";
import { Action } from "shared/actions/action";
import { InjectType } from "shared/decorators/field/Inject-type";

@Controller({})
export class NotificationController implements OnStart {
	@InjectType
	private logger!: Logger;

	public onStart() {
		Action.OnGotResponse.Connect((action, response) => {
			if (response.success) return;

			this.logger.Debug("This response was rejected: ", action.Name, response.message);
		});
	}
}
