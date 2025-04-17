import { Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { InferSharedComponentState } from "@rbxts/shared-components-flamework/out/types";
import { Collisions } from "shared/collisions";
import { Character } from "shared/components/character";

@Component({})
export class ServerCharacter extends Character implements OnStart {
	public onStart() {
		this.instance.GetDescendants().forEach((instance) => {
			if (instance.IsA("BasePart")) {
				instance.CollisionGroup = Collisions.Player;
			}
		});

		this.instance.AddTag("Character");
	}
}
