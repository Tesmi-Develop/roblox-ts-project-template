export function filterWorkspaceBaseParts(instances: Instance[]) {
	return instances.filter(
		(instance) => instance.IsA("BasePart") && instance.FindFirstAncestorOfClass("Workspace") !== undefined,
	) as BasePart[];
}
