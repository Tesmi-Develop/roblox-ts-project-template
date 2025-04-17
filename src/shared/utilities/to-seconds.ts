type Digits = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type DigitsToFive = 0 | 1 | 2 | 3 | 4 | 5;

type TimeNumber = `${DigitsToFive}${Digits}` | Digits;

type Time = `${TimeNumber}`;

type TimeFormat<S> = S extends ""
	? unknown
	: S extends `${`${Time}:`}${infer Tail}`
		? TimeFormat<Tail>
		: S extends Time
			? unknown
			: never;

type NotEmptyString<S> = S extends "" ? never : S;

export const ToSeconds = <S extends string>(stringTime: S & NotEmptyString<S> & TimeFormat<S>): number => {
	const numbers = stringTime.split(":");
	let time = 0;
	let multi = 1;

	for (let i = numbers.size() - 1; i >= 0; i--) {
		time += (tonumber(numbers[i]) as number) * multi;
		multi *= 60;
	}

	return time;
};
