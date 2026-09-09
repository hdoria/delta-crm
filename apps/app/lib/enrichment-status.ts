import type { EnrichmentStatus } from "@crm/db/enums";
import type { StatusTone } from "@crm/ui/components/status-indicator";

export type EnrichmentKey = EnrichmentStatus | "QUEUED";

const PRESENTATION: Record<
	EnrichmentStatus,
	{ tone: StatusTone; busy?: boolean }
> = {
	PENDING: { tone: "neutral" },
	RUNNING: { tone: "info", busy: true },
	COMPLETE: { tone: "success" },
	FAILED: { tone: "error" },
	SKIPPED: { tone: "neutral" },
};

const QUEUED = { tone: "neutral" as StatusTone, busy: false };

export const ENRICHMENT_POLL_MS = 3_000;

export const ENRICHMENT_IDLE_POLL_MS = 30_000;

export const ENRICHMENT_STATUSES = Object.keys(
	PRESENTATION,
) as EnrichmentStatus[];

export function enrichmentPresentation(
	status: EnrichmentStatus,
	queued: boolean,
): { key: EnrichmentKey; tone: StatusTone; busy?: boolean } {
	return status === "PENDING" && queued
		? { key: "QUEUED", ...QUEUED }
		: { key: status, ...PRESENTATION[status] };
}

export function isEnriching(status: EnrichmentStatus, queued = false): boolean {
	return status === "RUNNING" || (status === "PENDING" && queued);
}
