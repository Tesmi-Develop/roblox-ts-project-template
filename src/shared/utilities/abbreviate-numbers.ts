import Abbreviator from "@rbxts/abbreviate";

const Suffixs = [
	"K",
	"M",
	"B",
	"T",
	"Qd",
	"Qn",
	"Sx",
	"Sp",
	"O",
	"N",
	"De",
	"Ud",
	"DD",
	"tdD",
	"QnD",
	"SxD",
	"SpD",
	"OcD",
	"NvD",
	"VgN",
	"UvG",
	"DvG",
	"TvG",
	"QtV",
	"QnV",
	"SeV",
	"SpG",
	"OvG",
	"NvG",
	"TgN",
	"UtG",
	"DtG",
	"TsTg",
	"QtTg",
	"QnTg",
	"SsTg",
	"SpTg",
	"OcTg",
	"NoTg",
	"QdDr",
	"UnAg",
	"DuAg",
	"TeAg",
	"QdAg",
	"QnAG",
	"SxAg",
	"SpAg",
	"OcAg",
	"NvAg",
	"CT",
];

const abbreviator = new Abbreviator();
abbreviator.setSetting("decimalPlaces", 2);
abbreviator.setSetting("suffixTable", Suffixs);
abbreviator.setSetting("stripTrailingZeroes", true);

export const AbbreviateNumber = (number: number) => {
	if (number === math.huge) {
		return "∞";
	}

	return abbreviator.numberToString(number, true);
};

export const AbbreviateString = (str: string) => {
	return abbreviator.stringToNumber(str);
};
