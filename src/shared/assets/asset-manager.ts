import assets from "./assets";

type ConvertPath<P, A extends string[] = []> = P extends ""
	? A
	: P extends `${infer R}/${infer C}`
		? ConvertPath<C, [...A, R]>
		: P extends `${string}.${string}`
			? [...A, P]
			: never;

type IsFolder<F extends string> = F extends `${string}.${string}` ? false : true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OmitFirstValue<A> = A extends [infer _, ...infer R] ? R : never;

type ConvertPathWitoutFile<P, A extends string = ""> = P extends ""
	? Exclude<
			P extends ""
				? A
				: P extends `${infer R}/${infer C}`
					? ConvertPathWitoutFile<C, A extends "" ? R : `${A}/${R}`>
					: A,
			""
		>
	: A;

type Roots<P> = {
	[K in P extends string[] ? P[0] : never]: IsFolder<K> extends true ? Roots<OmitFirstValue<P>> : string;
};

type AssetTree = Roots<ConvertPath<keyof typeof assets>>;

type KeyofRoot<T> = NonNullable<keyof T>;

export namespace AssetManager {
	export const Tree: AssetTree = {} as AssetTree;

	const isFolder = (folder: string) => folder.split(".").size() === 1;

	export const GetFile = <T extends keyof typeof assets>(path: T) => assets[path];

	export const GetFiles = (pathString: ConvertPathWitoutFile<keyof typeof assets>) => {
		const typedPath = pathString as string;
		const path = typedPath.split(".");
		let pointer = Tree;

		path.forEach((value) => {
			pointer = pointer[value as never];
		});

		return table.clone(pointer);
	};

	export const LoadTree = () => {
		const files: { path: string[]; value: string }[] = [];

		// eslint-disable-next-line roblox-ts/no-array-pairs
		for (const [k, value] of pairs(assets)) {
			const typedPath = k as string;
			files.push({ path: typedPath.split("/"), value: value as string });
		}

		files.forEach((pathData) => {
			let pointer = Tree;
			pathData.path.forEach((path) => {
				if (isFolder(path)) {
					const prevPointer = pointer;
					pointer = pointer[path as never] ?? {};
					prevPointer[path as never] = pointer as never;
					return;
				}

				pointer[path as never] = pathData.value as never;
			});
		});
	};
}

AssetManager.LoadTree();
