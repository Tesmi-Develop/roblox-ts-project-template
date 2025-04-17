import { BaseComponent } from "@flamework/components";
import { Controller, Modding, OnRender, OnStart } from "@flamework/core";
import { UserInputService, Workspace } from "@rbxts/services";
import { OnMouseHoverEnd, OnMouseHoverStart } from "client/event-hooks/on-mouse-hovered";
import { LocalPlayer } from "shared/utilities/constants";
import { FindFirstAncestorOfClassWithPredict, GetDistance } from "shared/utilities/function-utilities";

@Controller({})
export class MouseHoverController implements OnStart, OnRender {
	private instances = new Map<BasePart | Model, Partial<OnMouseHoverStart & OnMouseHoverEnd>>();
	private raycastParams = new RaycastParams();
	private foundInstance?: BasePart | Model;

	onStart() {
		this.raycastParams.FilterType = Enum.RaycastFilterType.Include;
		this.handleMouseHover();
	}

	private handleMouseHover() {
		Modding.onListenerAdded<OnMouseHoverStart>((object) => {
			if (!(object instanceof BaseComponent)) return;

			const component = object as BaseComponent;
			if (!component.instance.IsA("Model") && !component.instance.IsA("BasePart")) return;

			this.raycastParams.AddToFilter(object.instance);
			this.instances.set(object.instance, object);
		});

		Modding.onListenerRemoved<OnMouseHoverStart>((object) => {
			if (!(object instanceof BaseComponent)) return;

			this.instances.delete(object.instance);
		});

		Modding.onListenerAdded<OnMouseHoverEnd>((object) => {
			if (!(object instanceof BaseComponent)) return;

			const component = object as BaseComponent;
			if (!component.instance.IsA("Model") && !component.instance.IsA("BasePart")) return;

			this.raycastParams.AddToFilter(object.instance);
			this.instances.set(object.instance, object);
		});

		Modding.onListenerRemoved<OnMouseHoverEnd>((object) => {
			if (!(object instanceof BaseComponent)) return;

			this.instances.delete(object.instance);
		});
	}

	private activateListener(instance: BasePart | Model) {
		const component = this.instances.get(instance);
		if (!component || !component.onMouseHoverStart) return;

		component.onMouseHoverStart();
	}

	private deactivateListener(instance: BasePart | Model) {
		const component = this.instances.get(instance);
		if (!component || !component.onMouseHoverEnd) return;

		component.onMouseHoverEnd();
	}

	private validateDistance(startPoint: Vector3, endPoint: Vector3, distance: number) {
		return GetDistance(startPoint, endPoint) <= distance;
	}

	private findInstance() {
		const mousePosition = UserInputService.GetMouseLocation();
		const ray = Workspace.CurrentCamera!.ViewportPointToRay(mousePosition.X, mousePosition.Y);
		if (!ray) return;

		const result = Workspace.Raycast(ray.Origin, ray.Direction.mul(50), this.raycastParams);
		if (!result) return;

		if (this.instances.has(result.Instance)) {
			const component = result.Instance;
			return component;
		}

		return (
			FindFirstAncestorOfClassWithPredict(result.Instance, "Model", (instance) => {
				return this.instances.has(instance);
			}) ??
			FindFirstAncestorOfClassWithPredict(result.Instance, "Tool", (instance) => {
				return this.instances.has(instance);
			})
		);
	}

	private getComponent(instance: BasePart | Model) {
		return this.instances.get(instance);
	}

	private getPosition(instance: BasePart | Model) {
		if (instance.IsA("Model")) {
			return instance.GetPivot().Position;
		}

		return instance.Position;
	}

	public onRender() {
		const instance = this.findInstance();
		const character = LocalPlayer.Character;
		if (instance === this.foundInstance || !character || !character.PrimaryPart) return;

		if (this.foundInstance && this.foundInstance !== instance) {
			this.deactivateListener(this.foundInstance);
		}

		if (!instance) {
			this.foundInstance = instance;
			return;
		}

		const component = this.getComponent(instance);
		if (component && component?.validDistance) {
			if (
				!this.validateDistance(
					character.PrimaryPart!.Position,
					this.getPosition(instance),
					component.validDistance,
				)
			)
				return;
		}

		this.foundInstance = instance;
		instance && this.activateListener(instance);
	}
}
