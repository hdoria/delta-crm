"use client";

import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import {
	OVERVIEW_SCOPES,
	type OverviewScope,
	overviewParsers,
} from "./overview-search-params";

function isScope(value: string): value is OverviewScope {
	return (OVERVIEW_SCOPES as readonly string[]).includes(value);
}

export function OverviewScopeToggleFallback() {
	const t = useTranslations("overview.scope");
	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			disabled
			aria-label={t("aria")}
		>
			{OVERVIEW_SCOPES.map((value) => (
				<ToggleGroupItem key={value} value={value}>
					{t(value)}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

export function OverviewScopeToggle() {
	const t = useTranslations("overview.scope");
	const [scope, setScope] = useQueryState(
		SEARCH_PARAM.overview.scope,
		overviewParsers[SEARCH_PARAM.overview.scope],
	);

	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			value={scope}
			onValueChange={(next) => {
				if (isScope(next)) void setScope(next);
			}}
			aria-label={t("aria")}
		>
			{OVERVIEW_SCOPES.map((value) => (
				<ToggleGroupItem key={value} value={value}>
					{t(value)}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
