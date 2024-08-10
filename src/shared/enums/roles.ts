import Object from "@rbxts/object-utils";

/* eslint-disable prettier/prettier */
interface Role {
	Rank: number;
}

export const Roles = {
	"Developer": {
		Rank: 999,
	},
	"User": {
		Rank: 0
	}
} satisfies Record<string, Role>;

export const GetRole = (role: keyof typeof Roles) => Roles[role] as Role;
export const SortedRoles = Object.keys(Roles).sort((a, b) => Roles[a].Rank > Roles[b].Rank)

export type Roles = keyof typeof Roles;

export const IsHaveRank = (role: keyof typeof Roles, rank: number | keyof typeof Roles) => {
	if (typeIs(rank, "string")) {
		return Roles[role].Rank >= Roles[rank].Rank;
	}

	return Roles[role].Rank >= rank;
}