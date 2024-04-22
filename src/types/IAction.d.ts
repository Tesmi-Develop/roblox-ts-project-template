export interface IAction<D extends object = {}> {
	Name: string;
	Data: D;
}
