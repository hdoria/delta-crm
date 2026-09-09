"use client";

import { createContext, type ReactNode, useContext } from "react";

export const UI_LABELS = {
	close: "Close",
	clear: "Clear",
	sortBy: "Sort by",
	ascending: "Ascending",
	descending: "Descending",
	toggleColumns: "Toggle columns",
	noResults: "No results found.",
	selectRow: "Select row",
	selectAllRows: "Select every row on this page",
	detail: "Detail",
	searchNamed: "Search {name}…",
	reorderNamed: "Reorder {name}",
	scrollToEnd: "Scroll to end",
	scrollToStart: "Scroll to start",
	loadedNamed: "{name} loaded",
} as const;

export type UiLabels = { [K in keyof typeof UI_LABELS]: string };

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
