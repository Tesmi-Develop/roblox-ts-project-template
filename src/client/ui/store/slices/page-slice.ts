import { createProducer } from "@rbxts/reflex";
import { Pages } from "client/ui/settings/pages";
import { RootState } from "..";

const initState = {
	Page: Pages.None,
	IsLocked: false,
};

export const PageSlice = createProducer(initState, {
	SetPage: (state, page: Pages) => {
		if (state.IsLocked) return state;
		return {
			...state,
			Page: page,
		};
	},

	SwitchPage: (state, page: Pages) => {
		if (state.IsLocked) return state;
		return page === state.Page ? { ...state, Page: Pages.None } : { ...state, Page: page };
	},

	ClearPage: (state) => {
		if (state.IsLocked) return state;
		return { ...state, Page: Pages.None };
	},

	SetLockPage: (state, isLocked: boolean) => {
		return {
			...state,
			IsLocked: isLocked,
		};
	},
});

export const SelectPage = (state: RootState) => state.page.Page;
export const SelectIsLockedPage = (state: RootState) => state.page.IsLocked;
