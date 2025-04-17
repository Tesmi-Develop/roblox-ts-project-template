import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { promiseR15 } from "@rbxts/character-promise";
import Signal from "@rbxts/rbx-better-signal";
import { ClientCharacter } from "client/components/character";
import { Multiplace } from "shared/decorators/constructor/multiplace";
import { InjectType } from "shared/decorators/field/Inject-type";
import { LocalPlayer } from "shared/utilities/constants";

@Controller({})
export class CharacterController implements OnStart {
	public readonly OnDied = new Signal<() => void>();

	@InjectType
	private components!: Components;

	private processCharacter(character: Model) {
		promiseR15(character).then((validatedCharacter) => {
			this.components.addComponent<ClientCharacter>(validatedCharacter);
		});
	}

	public Get() {
		if (!LocalPlayer.Character) return;
		return this.components.getComponent<ClientCharacter>(LocalPlayer.Character);
	}

	public onStart() {
		LocalPlayer.CharacterAdded.Connect((character) => this.processCharacter(character));
		LocalPlayer.CharacterRemoving.Connect((character) => {
			this.components.removeComponent<ClientCharacter>(character);
		});

		LocalPlayer.Character && this.processCharacter(LocalPlayer.Character);
	}
}
