/// <reference types="@rbxts/testez/globals" />

import { PlayerComponent } from "server/components/player-component";
import { Action } from "shared/actions/action";
import { ActionDecorator } from "shared/decorators/constructor/action-decorator";
import { SuccessProcessAction } from "shared/utilities/function-utilities";
import { ServerResponse } from "types/server-response";

export = () => {
	describe("Testing actions", () => {
		@ActionDecorator()
		class _TestAction1 extends Action<{ a: number }, void> {
			protected doAction(playerComponent: PlayerComponent): ServerResponse<void> {
				return SuccessProcessAction();
			}
		}

		@ActionDecorator()
		class _TestAction2 extends Action<{ b: number }, void> {
			protected doAction(playerComponent: PlayerComponent): ServerResponse<void> {
				return SuccessProcessAction();
			}
		}

		const actionInstnace1 = new _TestAction1({ a: 1 });
		const actionInstnace2 = new _TestAction2({ b: 1 });

		it("Should have guard", () => {
			expect(actionInstnace1.validate()).equal(true);
			expect(actionInstnace2.validate()).equal(true);
		});
	});
};
