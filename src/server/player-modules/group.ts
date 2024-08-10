import { Logger } from "@rbxts/log";
import Signal from "@rbxts/rbx-better-signal";
import { PlayerComponent } from "server/components/player-component";
import { OnDestroyModule, OnStartModule, PlayerModule } from "shared/decorators/constructor/player-module-decorator";
import { InjectType } from "shared/decorators/field/Inject-type";
import { DataCollection } from "shared/singletons/data-collection";

@PlayerModule({
	IsDisableInTestMode: true,
})
export class GroupModule implements OnStartModule, OnDestroyModule {
	public readonly OnGotInfo = new Signal();
	@InjectType
	private player!: PlayerComponent;

	@InjectType
	private logger!: Logger;

	@InjectType
	private dataCollection!: DataCollection;
	private groupId = this.dataCollection.GlobalSettings.GroupId;
	private isJoined = false;
	private rank = 0;
	private role = "";
	private isLoaded = false;

	public IsJoined() {
		return this.isJoined;
	}

	public GetRank() {
		return this.rank;
	}

	public GetRole() {
		return this.role;
	}

	private async IsInGroup() {
		return this.player.instance.IsInGroup(this.groupId);
	}

	private async getRole() {
		return this.player.instance.GetRoleInGroup(this.groupId);
	}

	private async getRank() {
		return this.player.instance.GetRankInGroup(this.groupId);
	}

	public async OnStartModule() {
		this.isJoined = await this.IsInGroup();
		this.rank = await this.getRank();
		this.role = await this.getRole();
		this.logger.Debug(`Joined: ${this.isJoined}, Rank: ${this.rank}, Role: ${this.role}`);
		this.isLoaded = true;
		this.OnGotInfo.Fire();
	}

	public async WaitForStarting() {
		if (this.isLoaded) return;
		this.OnGotInfo.Wait();
	}

	public OnDestroyModule() {
		this.OnGotInfo.Destroy();
	}
}
