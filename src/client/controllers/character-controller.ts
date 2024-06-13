import { Controller, OnStart } from "@flamework/core";
import { CharacterRigR15, CharacterRigR6, promiseR15, promiseR6 } from "@rbxts/character-promise";
import Signal from "@rbxts/rbx-better-signal";
import { LocalPlayer } from "shared/utilities/constants";

const CHARACTER_TYPE = "R15";

type GetCharacterType<T extends "R15" | "R6"> = T extends "R15" ? CharacterRigR15 : CharacterRigR6;

@Controller({})
export class CharacterController implements OnStart {
	public readonly OnRemoving = new Signal<() => void>();
	public readonly OnAdded = new Signal<(character: GetCharacterType<typeof CHARACTER_TYPE>) => void>();
	private tracks = new Map<Animation, AnimationTrack>();
	private character?: GetCharacterType<typeof CHARACTER_TYPE>;
	private promiseCharacter = (CHARACTER_TYPE as "R15" | "R6") === "R15" ? promiseR15 : promiseR6;

	onStart() {
		const processCharacter = (character: Model) => {
			(this.promiseCharacter(character) as Promise<GetCharacterType<typeof CHARACTER_TYPE>>).then(
				(validatedCharacter) => {
					this.character = validatedCharacter as never;
				},
			);
			this.tracks.clear();
			this.OnAdded.Fire(character as never);
		};
		LocalPlayer.CharacterAdded.Connect(processCharacter);

		LocalPlayer.CharacterRemoving.Connect(() => {
			this.character = undefined;
			this.OnRemoving.Fire();
		});

		this.character && processCharacter(this.character);
	}

	public GetCharacter() {
		return this.character;
	}

	public StopAnimation(animation: Animation) {
		const track = this.tracks.get(animation);
		if (!track) return;

		track.Stop();

		return track;
	}

	public PlayAnimation(animation: Animation): AnimationTrack {
		const animator = LocalPlayer.Character?.FindFirstChildOfClass("Humanoid")?.FindFirstChildOfClass(
			"Animator",
		) as Animator;

		let track = this.tracks.get(animation);

		if (track !== undefined) {
			track.Play();
			return track;
		}

		track = animator.LoadAnimation(animation);
		track.Play();

		this.tracks.set(animation, track);

		return track;
	}
}
