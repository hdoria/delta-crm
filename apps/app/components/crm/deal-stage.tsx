"use client";

import type { DealStage } from "@crm/db/enums";
import { StatusIndicator } from "@crm/ui/components/status-indicator";
import { useTranslations } from "next-intl";
import { dealStageTone } from "@/lib/deal-stage";

export function DealStageIndicator({
	stage,
	className,
}: {
	stage: DealStage;
	className?: string;
}) {
	const t = useTranslations("dealStage");

	return (
		<StatusIndicator
			tone={dealStageTone(stage)}
			label={t(stage)}
			className={className}
		/>
	);
}
