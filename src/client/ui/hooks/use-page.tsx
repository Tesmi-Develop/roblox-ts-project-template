import { useBindingListener } from "@rbxts/pretty-react-hooks";
import React, { useBinding, useEffect } from "@rbxts/react";
import { setTimeout } from "@rbxts/set-timeout";
import { Pages } from "../settings/pages";
import { SelectPage } from "../store/slices/page-slice";
import { useAppSelector, useAppSelectorBinding } from "./reflex-hooks";

export const usePage = (page: Pages, timeToClose?: number, onChangedState?: (isOpen: boolean) => void) => {
	const previosPage = useAppSelector((state) => state.page.PreviosPage);
	const currentPage = useAppSelector(SelectPage);
	const isOpen = page === currentPage;

	const [visible, setVisible] = React.useState(isOpen);

	useEffect(() => {
		onChangedState?.(isOpen);

		if (timeToClose !== undefined && !isOpen && previosPage === page) {
			return setTimeout(() => {
				setVisible(false);
			}, timeToClose);
		}

		setVisible(isOpen);
	}, [isOpen]);

	return visible;
};

export const usePageBinding = (page: Pages, timeToClose?: number, onChangedState?: (isOpen: boolean) => void) => {
	const previosPage = useAppSelectorBinding((state) => state.page.PreviosPage);
	const currentPage = useAppSelectorBinding(SelectPage);
	const [visible, setVisible] = useBinding(currentPage.getValue() === page);

	useBindingListener(currentPage, (currentPage) => {
		const isOpen = page === currentPage;
		onChangedState?.(isOpen);

		if (timeToClose !== undefined && !isOpen && previosPage.getValue() === page) {
			return setTimeout(() => {
				setVisible(false);
			}, timeToClose);
		}

		setVisible(isOpen);
	});

	return visible;
};
