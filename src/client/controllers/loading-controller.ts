import { Controller } from "@flamework/core";
import { ContentProvider, ReplicatedStorage, Workspace } from "@rbxts/services";
import { PlayerGui } from "shared/utilities/constants";
import { OnDataReplicated } from "./player-controller";

@Controller({})
export class LoadingController implements OnDataReplicated {
	private isReplicated = false;
	private thread?: thread;

	private loadInstance(instance: Instance | string) {
		return new Promise<void>((resolve) => {
			ContentProvider.PreloadAsync([instance]);
			resolve();
		})
			.timeout(10)
			.catch(() => {});
	}
	public async LoadAssets(progressBinding: (value: number) => void) {
		const promises = Workspace.GetChildren().map((instance) => this.loadInstance(instance));
		ReplicatedStorage.GetChildren().forEach((instance) => promises.push(this.loadInstance(instance)));
		PlayerGui.GetDescendants().forEach((instance) => promises.push(this.loadInstance(instance)));

		promises.forEach((promise) => {
			promise.then(() => progressBinding(1 / promises.size()));
		});

		await Promise.allSettled(promises);
	}

	public OnDataReplicated() {
		this.isReplicated = true;
		this.thread && coroutine.resume(this.thread)[0];
	}

	public async WaitForLoadData() {
		if (this.isReplicated) return;
		this.thread = coroutine.running();

		coroutine.yield();
	}
}
