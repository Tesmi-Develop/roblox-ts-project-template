import { GetClassName } from "shared/utilities/function-utilities";

export interface GameData {
	Name: string; // reference to the config
}

export abstract class Config {
	public Name: string;

	constructor() {
		this.Name = GetClassName(this);
	}
}
