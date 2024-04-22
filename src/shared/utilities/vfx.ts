export function ToggleEmitters(target: Instance, toggle: boolean) {
	target.GetDescendants().forEach((child) => {
		if (child.IsA("ParticleEmitter")) {
			child.Enabled = toggle;
		}
	});
}

export const SimpleFade1 = new NumberSequence([
	new NumberSequenceKeypoint(0, 0),
	new NumberSequenceKeypoint(0.7, 0),
	new NumberSequenceKeypoint(1, 1),
]);

export const Emit = (Object: Instance) => {
	async function emit(Emitter: ParticleEmitter) {
		const delay = (Emitter.GetAttribute("EmitDelay") as number) || 0;
		const emitCount = (Emitter.GetAttribute("EmitCount") as number) || 0;

		if (delay !== 0) {
			task.wait(delay);
		}
		Emitter.Emit(emitCount);
	}

	Object.GetDescendants().forEach((Emitter) => {
		if (!Emitter.IsA("ParticleEmitter")) return;

		emit(Emitter);
	});
	if (Object.IsA("ParticleEmitter")) {
		emit(Object);
	}
};
