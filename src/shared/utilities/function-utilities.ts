import { Modding } from "@flamework/core";
import { AbstractConstructor, Constructor } from "@flamework/core/out/utility";
import { CharacterRigR15, validateR15 } from "@rbxts/character-promise";
import { Atom } from "@rbxts/charm";
import { None, produce } from "@rbxts/immut";
import { Draft } from "@rbxts/immut/src/types-external";
import { Janitor } from "@rbxts/janitor";
import Object from "@rbxts/object-utils";
import { KeyCode } from "@rbxts/pretty-react-hooks";
import { Players, RunService, Workspace } from "@rbxts/services";
import type { PlayerAtom } from "server/components/player-component";
import { PlayerData } from "shared/schemas/player-data-types";
import { ServerResponse, ServerResponseError } from "types/server-response";
import { PatchDataType, ReturnMethods } from "types/utility";
import { Hour, IS_CLIENT, Minute, PATCH_ACTION_REMOVE } from "./constants";

export const RecursiveFindChild = <T extends Instance>(parent: Instance, filter: (obj: Instance) => boolean) => {
	for (let i = 0; i < parent.GetDescendants().size(); i++) {
		const child = parent.GetDescendants()[i];
		if (filter(child)) return child as T;
	}
};

export const FindFirstAncestorOfClassWithPredict = <T extends keyof Instances>(
	instance: Instance,
	className: T,
	predict: (Instance: Instances[T]) => boolean,
) => {
	let needInstance: Instance | undefined = instance;

	while (needInstance !== undefined) {
		needInstance = needInstance.FindFirstAncestorOfClass(className);

		if (needInstance === undefined) break;

		if (predict(needInstance as Instances[T])) {
			return needInstance as Instances[T];
		}
	}

	return undefined;
};

export const FailedProcessAction = (message = "", code = 1): ServerResponseError => {
	return {
		success: false,
		message: message,
		code: math.max(code, 1),
	};
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SuccessProcessAction = <T extends [undefined?] | [any] = [any]>(...value: T): ServerResponse<T[0]> => {
	return {
		success: true,
		message: (value as unknown[])[0],
		code: 0,
	};
};

export const GetRandomNumberFromNumberRange = (value: NumberRange, isRound = false) => {
	const random = new Random();
	return isRound ? random.NextInteger(value.Min, value.Max) : random.NextNumber(value.Min, value.Max);
};

export const CreateHitboxPart = (cframe?: CFrame, size?: Vector3, transparency?: number, color?: Color3) => {
	const part = new Instance("Part");

	part.CanCollide = false;
	part.CanQuery = false;
	part.CastShadow = false;
	part.CanTouch = false;
	part.Massless = true;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.Size = size || new Vector3(1, 1, 1);
	part.CFrame = cframe || new CFrame(0, 0, 0);
	part.Transparency = transparency || 0.7;
	part.Color = color || new Color3(0, 0, 1);
	part.Parent = Workspace;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BackSurface = Enum.SurfaceType.Smooth;
	part.FrontSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	part.RightSurface = Enum.SurfaceType.Smooth;
	part.LeftSurface = Enum.SurfaceType.Smooth;

	if (RunService.IsServer()) {
		part.SetNetworkOwner(undefined);
	}

	return part;
};

type GeneratorReturn<T extends boolean> = T extends true ? string : number;

export const CreateIdGenerator = <C extends boolean = true>(isString = true as C) => {
	let id = 0;
	return () => {
		id++;
		return (isString ? `${id}` : id) as GeneratorReturn<C>;
	};
};

export const CreatePointPart = (cframe?: CFrame, size?: Vector3, transparency?: number, color?: Color3) => {
	const part = new Instance("Part");

	part.CanCollide = false;
	part.CanQuery = false;
	part.CastShadow = false;
	part.CanTouch = false;
	part.Massless = true;
	part.Anchored = true;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.Size = size ?? new Vector3(1, 1, 1);
	part.CFrame = cframe ?? new CFrame(0, 0, 0);
	part.Transparency = transparency ?? 0.7;
	part.Color = color ?? new Color3(0, 0, 1);
	part.Parent = Workspace;

	return part;
};

export const GetCharactersInBox = (cframe: CFrame, size: Vector3, overlapParams: OverlapParams) => {
	const characters = new Set<CharacterRigR15>();
	const parts = Workspace.GetPartBoundsInBox(cframe, size, overlapParams);
	parts.forEach((part) => {
		const model = part.FindFirstAncestorOfClass("Model");
		if (!model) return;

		if (!validateR15(model)) return;
		characters.add(model as CharacterRigR15);
	});

	return characters;
};

export const GetCharacters = () => {
	const characters: Model[] = [];

	Players.GetPlayers().forEach((player) => {
		const character = player.Character;
		if (character) characters.push(character);
	});

	return characters;
};

export const CreateWeldConstraint = (part1: BasePart, part2: BasePart) => {
	const weld = new Instance("WeldConstraint");
	weld.Part0 = part1;
	weld.Part1 = part2;

	return weld;
};

export const DecoratePromiseInMaid = <T>(promise: Promise<T>, janitor: Janitor): Promise<T> => {
	janitor.Add(() => promise.cancel());
	return promise;
};

export function ResolveNumberRange(problem: number | NumberRange) {
	return typeIs(problem, "NumberRange") ? math.random(problem.Min, problem.Max) : problem;
}

function FormatZeroZero(num: number) {
	return string.format("%02i", num);
}

export function ToHMS(seconds: number, fullFormat = false) {
	if (fullFormat) {
		let minutes = (seconds - (seconds % 60)) / 60;
		seconds = seconds - minutes * 60;
		const hours = (minutes - (minutes % 60)) / 60;
		minutes = minutes - hours * 60;

		return `${FormatZeroZero(hours)}:${FormatZeroZero(minutes)}:${FormatZeroZero(seconds)}`;
	}

	if (seconds < Hour) {
		return "%02i:%02i".format((seconds / 60) % 60, seconds % 60);
	}

	return "%02i:%02i:%02i".format(seconds / 60 ** 2, (seconds / 60) % 60, seconds % 60);
}

export const WaitForEvent = <T>(
	event: RBXScriptSignal<(value: T) => void>,
	callback: (value: T) => boolean,
	janitor?: Janitor,
) => {
	const thread = coroutine.running();

	const connection = event.Connect((...args) => {
		if (callback(...args)) {
			coroutine.resume(thread);
			connection.Disconnect();
		}
	});

	janitor && janitor.Add(connection);

	coroutine.yield();
};

export const GetLengthAnimation = (track: AnimationTrack) => track.Length / track.Speed;

export const Lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Returns the class name of the given object.
 *
 * @param {object} object - The object whose class name is to be returned.
 * @return {string} The class name of the object.
 */
export const GetClassName = (object: object): string => {
	return `${getmetatable(object)}`;
};

export const GetClass = <T extends object>(instance: T): Constructor<T> => {
	return getmetatable(instance) as Constructor<T>;
};

export const UnchorInstances = (instance: Instance) => {
	instance.GetDescendants().forEach((child) => {
		if (!child.IsA("BasePart")) return;
		child.Anchored = false;
	});
};

export const GetKeycodeName = <T extends Enum.KeyCode>(keycode: T) => {
	return tostring(keycode).split(".").pop() as KeyCode;
};

export const GetDistance = (point1: Vector3, point2: Vector3, useY = true) => {
	if (useY) {
		return point2.sub(point1).Magnitude;
	}

	const point1WithoutY = new Vector3(point1.X, 0, point1.Z);
	const point2WithoutY = new Vector3(point2.X, 0, point2.Z);

	return point2WithoutY.sub(point1WithoutY).Magnitude;
};

export const GetNormalDelta = (point1: Vector3, point2: Vector3) => {
	return point1.sub(point2).Unit;
};

export const WeldAllDescendants = (model: Model | Accessory, canCollide?: boolean) => {
	const primaryPart = model.IsA("Model") ? model.PrimaryPart : (model.FindFirstChild("Handle") as BasePart);

	if (!primaryPart && model.IsA("Model")) {
		const part = model.FindFirstChildWhichIsA("BasePart");
		assert(part, "Not found primaryPart and cant find any BasePart");
		model.PrimaryPart = part;
		warn("PrimaryPart not found, using first BasePart");
	}

	model.GetDescendants().forEach((child) => {
		if (!child.IsA("BasePart")) return;
		if (child === primaryPart) return;

		child.Anchored = false;
		canCollide !== undefined && (child.CanCollide = canCollide);

		const weld = new Instance("WeldConstraint");
		weld.Part0 = primaryPart;
		weld.Part1 = child;

		weld.Parent = primaryPart;
	});
};

export const GetPointOnCircle2D = (angle: number, radius: number) => {
	const x = math.cos(math.rad(angle)) * radius;
	const y = math.sin(math.rad(angle)) * radius;

	return new Vector2(x, y);
};

export const GetPointInCircle = (angle: number, raduis: number) => {
	const x = math.cos(math.rad(angle)) * raduis;
	const z = math.sin(math.rad(angle)) * raduis;

	return new Vector3(x, 0, z);
};

export const ConvertTimeToText = (time: number) => {
	let str = `${math.floor(time)} Sec`;

	if (time >= Minute) {
		str = `${math.floor(time / Minute)} Min`;
	}

	if (time >= Hour) {
		str = `${math.floor(time / Hour)} Hours`;
	}

	return str;
};

export const ConcatArraies = <T extends defined, C extends defined>(array1: T[], ...arraies: C[][]): (T | C)[] => {
	const result = table.clone(array1) as (T | C)[];

	arraies.forEach((array2) => {
		array2.forEach((value) => {
			result.push(value);
		});
	});

	return result;
};

export const safeCloseThread = (thread?: thread) => thread && pcall(() => task.cancel(thread))[0];

export const AddAccessory = (accessory: Accessory, humanoid: Humanoid, weldOffest: CFrame) => {
	humanoid.AddAccessory(accessory);

	const primaryPart = accessory.FindFirstChild("Handle") as BasePart;
	assert(primaryPart, "Not found Handle");

	const maxAttempt = 10;
	let attemt = 0;

	let originalSize: Vector3Value | undefined = undefined;

	while (originalSize === undefined && attemt < maxAttempt) {
		originalSize = primaryPart.FindFirstChild("OriginalSize") as Vector3Value;
		attemt += 1;
		task.wait();
	}

	if (originalSize) {
		primaryPart.Size = originalSize.Value;
	}

	const weld = primaryPart.WaitForChild("AccessoryWeld") as Weld;
	weld.C1 = weldOffest;

	const originalWeldOffset = new Instance("CFrameValue", weld);
	originalWeldOffset.Name = "OriginalWeldOffest";
	originalWeldOffset.Value = weldOffest;
};

export const GetCurrentTime = (isRound = false): number => {
	return isRound ? math.round(Workspace.GetServerTimeNow()) : Workspace.GetServerTimeNow();
};

export const GetDifferenceNowTime = (time: number, isRound = false): number => {
	return isRound
		? math.round(math.abs(Workspace.GetServerTimeNow() - time))
		: math.abs(Workspace.GetServerTimeNow() - time);
};

export type WeightElement = {
	Weight: number;
};

export type RateElement = {
	Rate: number;
};

const getWeightElement = (element: WeightElement | RateElement) => {
	return "Rate" in element ? element.Rate : element.Weight;
};

export const GetChanceElement = <T extends WeightElement | RateElement>(
	elements: T[],
	index: number,
	fractionalNumber = 2,
) => {
	assert(index >= 0 && index < elements.size(), "Index out of range");
	let totalWeight = 0;

	elements.forEach((element) => (totalWeight += getWeightElement(element)));
	return round((getWeightElement(elements[index]) / totalWeight) * 100, fractionalNumber);
};

export const round = (n: number, scale = 2) => tonumber(string.format(`%.${scale}f`, n))!;

export const GetRandomElement = <T extends WeightElement | RateElement>(elements: T[], additioanlChance = 0) => {
	let suma = 0;
	let range = 0;

	elements.forEach((element) => {
		suma += getWeightElement(element);
	});

	let randomNumber = math.random() * suma + additioanlChance;
	randomNumber = math.clamp(randomNumber, 0, suma);

	for (const i of $range(0, elements.size() - 1)) {
		const foundElement = elements[i];
		const weight = getWeightElement(foundElement);
		range += weight;

		if (randomNumber <= range) {
			return foundElement as T;
		}
	}

	throw "Didn't found any element";
};

export function PickRandomElement<T>(array: T[]): T {
	assert(!array.isEmpty(), "Array is empty");
	return array[math.random(0, array.size() - 1)];
}

export function PickSign() {
	return math.random(0, 1) === 1 ? 1 : -1;
}

export function TimeoutPromise(timeout: number, rejectValue: unknown) {
	return Promise.delay(timeout).then(() => Promise.reject(rejectValue));
}

export function CallMethod<T extends Callback>(
	func: T,
	context: InferThis<T>,
	...parameters: Parameters<T>
): ReturnType<T> {
	return func(context, ...(parameters as unknown[]));
}

export function PatchData<D extends object>(prevData: D, patchData: PatchDataType<D>) {
	prevData = table.clone(prevData);
	patchData = table.clone(patchData);

	// eslint-disable-next-line roblox-ts/no-array-pairs
	for (const [key, value] of pairs(patchData)) {
		if (value === PATCH_ACTION_REMOVE) {
			prevData[key as never] = undefined as never;
			patchData[key as never] = undefined as never;
		}
	}

	return {
		...prevData,
		...patchData,
	};
}

type TMethod<T> = (self: InferThis<T>, ...parameters: Parameters<T>) => ReturnType<T>;

type GetContextFromConstructors<T> =
	T extends Constructor<infer C> ? C : T extends AbstractConstructor<infer C> ? C : never;

export const ModifyConstructorMethod = <T extends Constructor | AbstractConstructor, C extends Callback = Callback>(
	_constructor: T,
	methodName: ReturnMethods<GetContextFromConstructors<T>> | "constructor",
	visitor: (originalMethod: TMethod<C>) => (this: GetContextFromConstructors<T>, ...args: unknown[]) => unknown,
): T => {
	const modifiedMethod = visitor(_constructor[methodName as never]);
	_constructor[methodName as never] = modifiedMethod as never;
	return _constructor;
};

type Pattern<O extends object> = {
	[P in keyof O]?: O[P] | ((value: O[P]) => boolean);
};

export const IsMatch = <T extends object, P extends Pattern<T>>(obj: T, pattern: P) => {
	// eslint-disable-next-line roblox-ts/no-array-pairs
	for (const [key, value] of pairs(pattern)) {
		const valueIsFunction = value as (...args: unknown[]) => boolean;
		if (!typeIs(value, "function")) {
			if (obj[key as never] !== value) {
				return false;
			}

			continue;
		}

		if (!valueIsFunction(obj[key as never])) {
			return false;
		}
	}

	return true;
};

export const ValidateConditions = (...conditions: [boolean, string][]) => {
	const condition = conditions.find(([condition]) => !condition);
	return condition && condition[1];
};

export const MapObject = <T extends object, C extends defined>(
	obj: T,
	callback: (key: keyof T, value: T[keyof T]) => C,
) => {
	const newObject = {} as Record<keyof T, C>;

	for (const [key, value] of pairs(obj)) {
		newObject[key as keyof T] = callback(key as keyof T, value as T[keyof T]);
	}

	return newObject;
};

export const MapElements = <K, V, C>(map: Map<K, V>, callback: (key: K, value: V) => C) => {
	const newMap = new Map<K, C>();

	map.forEach((value, key) => {
		newMap.set(key, callback(key, value));
	});

	return newMap;
};

export const MapToArray = <K, V, C extends defined>(
	map: Map<K, V> | Record<string, V>,
	callback: (key: K, value: V) => C,
) => {
	const array = [] as C[];

	(map as Map<K, V>).forEach((value, key) => {
		array.push(callback(key, value));
	});

	return array;
};

const Timeout = 10;

export const restorePrimaryPart = (model: Model) => {
	if (model.PrimaryPart) return;

	const getPrimaryPart = () => {
		let foundPart = model.FindFirstChild("Primary");
		if (!foundPart) {
			const childrens = model.GetChildren();

			if (childrens.size() === 1 && childrens[0].IsA("BasePart")) {
				foundPart = childrens[0];
				foundPart.Name = "Primary";
			}
		}

		return foundPart;
	};

	let foundPart = getPrimaryPart();

	if (IS_CLIENT) {
		let passedTime = 0;
		while (!foundPart) {
			if (passedTime > Timeout) {
				warn("Trying to restore primary part");
				passedTime = 0;
			}

			task.wait(1);
			foundPart = getPrimaryPart();
			passedTime++;
		}
	}

	assert(foundPart && foundPart.IsA("BasePart"), "Primary part not found");
	model.PrimaryPart = foundPart as BasePart;
};

type TFnDecorator<T extends Callback> = (target: T) => T | void;
export const fnDecorate = <T extends Callback>(target: T, ...fnDecorators: TFnDecorator<T>[]) => {
	let newFunction = target;

	for (const i of $range(fnDecorators.size() - 1, 0, -1)) {
		const result = fnDecorators[i](newFunction);
		result && (newFunction = result);
	}

	return newFunction;
};

export const CreateInstanceWithountCallingConstructor = <T extends object>(
	constructor: Constructor<T>,
	...args: ConstructorParameters<Constructor<T>>
) => {
	const instance = setmetatable({}, constructor as object) as T;
	return [
		instance,
		() => {
			const callback = constructor["constructor" as never] as Callback;
			callback(instance, ...args);
		},
	] as const;
};

export function logError(message?: string, displayTraceback = true): never {
	return error(`${message ?? ""} \n \n ${displayTraceback && debug.traceback("", 2)}`);
}

export function logAssert<T>(condition: T, message?: string, displayTraceback = true): asserts condition {
	!condition &&
		error(
			`${message ?? ""} \n------------------------Traceback------------------------ ${
				displayTraceback && debug.traceback("", 2)
			}`,
		);
}

export const GetCurrentThread = <A extends unknown[]>() => {
	const currentThread = coroutine.running();

	return {
		Yield: (...args: A) => coroutine.yield(currentThread, ...args),
		Resume: () => coroutine.resume(currentThread) as LuaTuple<[success: boolean, ...result: A]>,
	};
};

type InferAtomState<T> = T extends Atom<infer S> ? S : T extends PlayerAtom ? PlayerData : never;

export const MutateAtom = <T, C>(
	atom: C,
	recipe: (
		draft: Draft<InferAtomState<C>>,
	) => typeof draft | void | undefined | (T extends undefined ? typeof None : never),
) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (atom as Callback)(produce((atom as Callback)() as never, recipe as never)) as C extends Atom<any>
		? void
		: boolean;
};

/** @metadata macro */
export const FunctionMany = <T>(v?: Modding.Many<T>) => v!;

export const WaitForTime = async (time: number) => {
	const thread = GetCurrentThread();

	const connection = RunService.Heartbeat.Connect(() => {
		if (time > GetCurrentTime()) return;
		connection.Disconnect();
		thread.Resume();
	});

	thread.Yield();
};

export function ChooseInRange<T>(list: Record<number, T>, value: number) {
	const keys = Object.keys(list);
	const maxKey = math.max(...keys);
	let best: number | undefined;

	keys.forEach((key) => {
		if (value < key && (best ? key < best : true)) {
			best = key;
		}
	});

	return best ? list[best] : list[maxKey];
}

export function InRange(value: number, min: number, max: number) {
	return value >= min && value <= max;
}

export function PickRandomElements<T extends defined[]>(elements: T, count: number) {
	assert(InRange(count, 0, elements.size()), "Count out of range");
	const copy = table.clone(elements);
	const result = [] as unknown as T;

	while (result.size() < count) {
		const index = math.random(0, copy.size() - 1);
		const element = copy[index];

		copy.remove(index);
		result.push(element);
	}

	return result;
}

export function ShuffleElements<T extends defined[]>(elements: T) {
	for (let i = elements.size() - 1; i > 0; i--) {
		const j = math.random(i);
		const temp = elements[i];

		elements[i] = elements[j];
		elements[j] = temp;
	}
}
