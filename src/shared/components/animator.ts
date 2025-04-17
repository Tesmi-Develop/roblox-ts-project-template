type Returned<T> = T extends Animation ? AnimationTrack : undefined;

export class AnimatorComponent {
	private animator: Animator;
	private loadedAnimations = new Map<Animation, AnimationTrack>();
	private currentAnimation?: Animation;
	private isLoockedAnimation = false;
	private animationConnection?: RBXScriptConnection;

	constructor(animator: Animator) {
		this.animator = animator;
	}

	public PlayAnimation(animation: Animation, speed?: number) {
		let track = this.loadedAnimations.get(animation);

		if (!track) {
			track = this.animator.LoadAnimation(animation);
			this.loadedAnimations.set(animation, track);
		}

		if (track.IsPlaying) return track;
		track.Play();

		if (!track.Looped) {
			this.animationConnection = track.Stopped.Once(() => {
				this.ChangeAnimation(undefined);
				this.animationConnection = undefined;
			});
		}

		track.AdjustSpeed(speed);

		return track;
	}

	public SetLockAnimation(status: boolean) {
		this.isLoockedAnimation = status;
	}

	public ChangeAnimation<T extends Animation | undefined>(animation?: T, speed?: number, fade?: number): Returned<T> {
		if (this.isLoockedAnimation) return this.loadedAnimations.get(animation!)! as Returned<T>;
		const oldAnimation = this.currentAnimation;
		this.currentAnimation = animation;

		if (animation === oldAnimation) return this.loadedAnimations.get(animation!)! as Returned<T>;

		this.animationConnection?.Disconnect();
		this.animationConnection && (this.animationConnection = undefined);
		oldAnimation && this.StopAnimation(oldAnimation, fade);

		if (this.currentAnimation) {
			return this.PlayAnimation(this.currentAnimation, speed) as Returned<T>;
		}

		return undefined as Returned<T>;
	}

	public StopAnimation(animation: Animation, fade?: number) {
		const track = this.loadedAnimations.get(animation);
		if (!track) return;

		track.Stop(fade);
	}
}
