import Object from "@rbxts/object-utils";
import { PhysicsService, RunService } from "@rbxts/services";

export enum Collisions {
	Player = "Player",
}

if (RunService.IsServer()) {
	Object.keys(Collisions).forEach((key) => {
		PhysicsService.RegisterCollisionGroup(key);
	});

	PhysicsService.CollisionGroupSetCollidable(Collisions.Player, Collisions.Player, false);
}
