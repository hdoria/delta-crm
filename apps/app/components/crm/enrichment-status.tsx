"use client";

import type { EnrichmentStatus } from "@crm/db/enums";
import { StatusIndicator } from "@crm/ui/components/status-indicator";
import { useTranslations } from "next-intl";
import { enrichmentPresentation } from "@/lib/enrichment-status";

export function EnrichmentIndicator({
	status,
	queued = false,
	title,
	className,
}: {
	status: EnrichmentStatus;
	queued?: boolean;
	title?: string | null;
	className?: string;
}) {
	const t = useTranslations("enrichmentStatus");
	const { key, tone, busy } = enrichmentPresentation(status, queued);

	return (
		<StatusIndicator
			tone={tone}
			busy={busy}
			label={t(key)}
			title={title ?? undefined}
			className={className}
		/>
	);
}
