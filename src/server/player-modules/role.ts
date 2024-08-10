import { Dependency } from "@flamework/core";
import { PlayerAtom, PlayerComponent } from "server/components/player-component";
import { OnStartModule, PlayerModule } from "shared/decorators/constructor/player-module-decorator";
import { InjectType } from "shared/decorators/field/Inject-type";
import { IsHaveRank, Roles, SortedRoles } from "shared/enums/roles";
import { DataCollection } from "shared/singletons/data-collection";
import { GroupModule } from "./group";

const RoleCheckers: Partial<Record<keyof typeof Roles, (player: PlayerComponent) => boolean>> = {
	Developer: (player) => {
		const rankInGroup = player.GetModule<GroupModule>().GetRank();
		const developerRank = Dependency<DataCollection>().GlobalSettings.DeveloperRank;

		return rankInGroup >= developerRank;
	},
};

@PlayerModule({
	IsDisableInTestMode: true,
})
export class RoleModule implements OnStartModule {
	@InjectType
	private atom!: PlayerAtom;

	@InjectType
	private player!: PlayerComponent;

	@InjectType
	private groupModule!: GroupModule;

	public HaveRole(role: keyof typeof Roles) {
		return this.atom().Save.Role === role;
	}

	public HaveRank(rank: number | keyof typeof Roles) {
		return IsHaveRank(this.atom().Save.Role, rank);
	}

	private grantRole(role: keyof typeof Roles) {
		this.atom.Mutate((draft) => {
			draft.Save.Role = role;
		});
		print(`[PlayerComponent: ${this.player.Name}] Role changed to ${role}`);
	}

	private updateRole() {
		const currentRole = this.atom().Save.Role;
		const currentRank = Roles[currentRole].Rank;

		SortedRoles.some((roleName) => {
			const role = Roles[roleName];
			if (role.Rank < currentRank || roleName === currentRole) return true;

			const checker = RoleCheckers[roleName];
			if (!checker) return false;

			const result = checker(this.player);
			result && this.grantRole(roleName);
			return result;
		});
	}

	public OnStartModule() {
		this.updateRole();

		this.groupModule.OnGotInfo.Connect(() => this.updateRole());
	}
}
