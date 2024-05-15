import { Controller, OnInit, OnStart, Modding } from "@flamework/core";
import { SharedClasses } from "@rbxts/shared-classes-reflex";
import { RootProducer } from "client/store";
import { LocalPlayer } from "shared/utilities/constants";

@Controller({
	loadOrder: 0,
})
export class PlayerController implements OnInit, OnStart {
	private tracks = new Map<Animation, AnimationTrack>();
	public readonly RootProducer = RootProducer;

	onInit() {
		return new Promise<void>((resolve) => {
			const disconnect = RootProducer.subscribe(
				(state) => state.PlayerData,
				() => {
					resolve();
					disconnect();
				},
			);
		});
	}

	/**@metadata macro */
	public GetClass<T>(id?: Modding.Generic<T, "id">) {
		assert(id);
		return Modding.getObjectFromId(id) as T;
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

	public onStart() {
		SharedClasses.StartClient();
	}
}
