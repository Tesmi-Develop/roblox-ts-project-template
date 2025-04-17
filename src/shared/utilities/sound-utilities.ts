import { SoundService } from "@rbxts/services";

interface SoundOption {
	parent?: Instance;
	destroyAfterPlay?: boolean;
	useOriginalSound?: boolean;
	soundGroup?: "Movement" | "BackgroundMusic" | "Ambient";
}

export function PlaySound(sound: Sound, options: SoundOption = {}) {
	options.destroyAfterPlay = options.destroyAfterPlay ?? false;
	options.useOriginalSound = options.useOriginalSound ?? false;

	const clone = options.useOriginalSound ? sound : sound.Clone();
	clone.Parent = options.parent ?? sound.Parent;
	clone.Play();

	if (options.soundGroup) {
		const group = SoundService.FindFirstChild("Main")?.FindFirstChild(options.soundGroup) as SoundGroup;
		clone.SoundGroup = group;
	}

	if (options.destroyAfterPlay) {
		clone.Ended.Once(() => {
			clone.Destroy();
		});
	}

	return clone;
}
