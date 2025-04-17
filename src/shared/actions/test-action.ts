import { ActionDecorator } from "shared/decorators/constructor/action-decorator";
import { SuccessProcessAction } from "shared/utilities/function-utilities";
import { Action } from "./action";

@ActionDecorator()
export class TestAction extends Action<{ testData: string }, void> {
	public IsSingleUse = true;

	protected doAction() {
		print(this.Data.testData);
		return SuccessProcessAction();
	}
}
