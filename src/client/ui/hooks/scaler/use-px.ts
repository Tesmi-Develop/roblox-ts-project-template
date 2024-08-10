import { useScalerApi } from "./context";

export function usePx() {
	const api = useScalerApi();
	return api.usePx();
}
