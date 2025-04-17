import { Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";
import { CharacterController } from "client/controllers/character-controller";
import { PlayerAtom } from "client/controllers/player-controller";
import { Character } from "shared/components/character";
import { InjectType } from "shared/decorators/field/Inject-type";
import { DataCollection } from "shared/singletons/data-collection";
import { DependenciesContainer } from "shared/utilities/dependencies-container";

@Component({})
export class ClientCharacter extends Character implements OnStart {
	private currentTrack?: AnimationTrack;
	private previousTrack?: AnimationTrack;
	private loadedTracks: Map<Animation, AnimationTrack> = new Map();
	private dependencyContainer = new DependenciesContainer(true);
	private janitor = new Janitor();

	private getTrack(animation: Animation) {
		if (!this.loadedTracks.has(animation)) {
			const track = this.instance.Humanoid.Animator.LoadAnimation(animation);
			this.loadedTracks.set(animation, track);
		}

		return this.loadedTracks.get(animation)!;
	}

	public StopAnimation(fade?: number) {
		if (!this.currentTrack) return;
		this.currentTrack.Stop(fade);
		this.currentTrack = undefined;
	}

	public PlayAnimation(
		animation: Animation,
		fade?: number,
		priority?: Enum.AnimationPriority,
		sideTrack: boolean = false,
		fadePreviousAnimation?: number,
	) {
		const track = this.getTrack(animation);

		if (priority) track.Priority = priority;

		if (this.currentTrack === track) return this.currentTrack;
		if (this.currentTrack && !sideTrack) this.currentTrack.Stop(fadePreviousAnimation ?? fade);

		track.Play(fade);

		if (!sideTrack) {
			this.previousTrack = this.currentTrack;
			this.currentTrack = track;
		}

		return track;
	}

	public PlayPreviousAnimation(fade?: number) {
		if (!this.previousTrack || !this.previousTrack.Animation) return;
		this.PlayAnimation(this.previousTrack.Animation, fade, this.previousTrack!.Priority);
	}

	public destroy(): void {
		super.destroy();
		this.janitor.Cleanup();
	}

	public onStart() {
		this.dependencyContainer.Register<ClientCharacter>(() => this);
	}
}
