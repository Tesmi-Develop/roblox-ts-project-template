import { useLatest, useMountEffect } from "@rbxts/pretty-react-hooks";
import { useBinding, useRef } from "@rbxts/react";

export function useInputBox(filter?: (text: string) => string) {
	const [content, setContent] = useBinding("");
	const onFilter = useLatest(filter);
	const ref = useRef<TextBox>();

	useMountEffect(() => {
		if (!ref.current) return;

		setContent(ref.current.Text);
		const connection = ref.current.GetPropertyChangedSignal("Text").Connect(() => {
			if (onFilter.current) {
				ref.current!.Text = onFilter.current(ref.current!.Text);
			}

			setContent(ref.current!.Text);
		});

		return () => connection.Disconnect();
	});

	return [
		content,
		ref,
		(text: string) => {
			if (!ref.current) return;
			setContent(text);
			ref.current.Text = text;
		},
	] as const;
}
