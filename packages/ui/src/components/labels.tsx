"use client";

import { UI_LABELS, type UiLabels } from "@crm/ui/lib/ui-labels";
import { createContext, type ReactNode, useContext } from "react";

const UiLabelsContext = createContext<Partial<UiLabels>>({});

export function UiLabelsProvider({
	value,
	children,
}: {
	value: Partial<UiLabels>;
	children: ReactNode;
}) {
	return (
		<UiLabelsContext.Provider value={value}>{children}</UiLabelsContext.Provider>
	);
}

export function useUiLabel(
	key: keyof UiLabels,
	values?: Record<string, string>,
): string {
	const overrides = useContext(UiLabelsContext);
	const template = overrides[key] ?? UI_LABELS[key];

	if (!values) return template;

	return Object.entries(values).reduce(
		(text, [name, value]) => text.replaceAll(`{${name}}`, value),
		template,
	);
}
