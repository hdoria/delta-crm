"use client";

import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import {
	SimpleTable,
	type SimpleTableColumn,
	SimpleTableRow,
} from "@crm/ui/components/simple-table";
import { TableCell } from "@crm/ui/components/table";
import { formatMoney } from "@crm/ui/lib/format";
import { useLocale, useTranslations } from "next-intl";
import { CompanyCell } from "@/components/crm/company-cell";
import { DealStageIndicator } from "@/components/crm/deal-stage";
import { OwnerCell } from "@/components/crm/owner-cell";
import { usePrefetchRecord } from "@/components/crm/record-sheet/record-prefetch";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { LocalDay } from "@/components/local-date-time";
import type { DealListItem, DealListResult } from "@/lib/agent-transcript";
import { DEAL_STAGES } from "@/lib/deal-stage";

export function DealListResultTable({ result }: { result: DealListResult }) {
	const locale = useLocale();
	const t = useTranslations("agentBuilder.dealList");
	const openRecord = useOpenRecord();
	const prefetchRecord = usePrefetchRecord();
	const count = result.deals.length;
	const title = tableTitle(result, t);
	const columns: SimpleTableColumn[] = [
		{ id: "deal", header: t("columnDeal"), width: "w-[20%]" },
		{ id: "company", header: t("columnCompany"), width: "w-[18%]" },
		{ id: "stage", header: t("columnStage"), width: "w-[18%]" },
		{
			id: "amount",
			header: t("columnAmount"),
			width: "w-[12%]",
			align: "right",
		},
		{ id: "owner", header: t("columnOwner"), width: "w-[14%]" },
		{ id: "close", header: t("columnClose"), width: "w-[12%]" },
		{ id: "idle", header: t("columnIdle"), width: "w-[8%]", align: "right" },
	];

	return (
		<section aria-label={title} className="flex w-full flex-col gap-3">
			<SimpleTable
				columns={columns}
				className="min-w-[56rem] table-fixed [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4"
				headerHeight="h-11"
			>
				{count === 0 ? (
					<SimpleTableRow>
						<TableCell
							colSpan={columns.length}
							className="h-32 whitespace-normal py-8 text-center align-middle text-muted-foreground"
						>
							{t("noDeals")}
						</TableCell>
					</SimpleTableRow>
				) : (
					result.deals.map((deal) => {
						const record = { kind: "deal" as const, id: deal.id };

						return (
							<SimpleTableRow
								key={deal.id}
								clickable
								onClick={() => openRecord(record)}
								onFocus={() => prefetchRecord(record)}
								onMouseEnter={() => prefetchRecord(record)}
							>
								<TableCell className="overflow-hidden px-3 py-3">
									<span className="block truncate font-medium">
										{deal.name}
									</span>
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									<CompanyCell company={deal.company} />
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									<Stage stage={deal.stage} />
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3 text-right">
									{deal.amount === null ? (
										<EmptyCellValue />
									) : (
										<span className="tabular-nums">
											{formatMoney(
												Math.round(deal.amount * 100),
												deal.currency,
												locale,
											)}
										</span>
									)}
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									<OwnerCell owner={deal.owner} />
								</TableCell>
								<TableCell className="overflow-hidden px-3 py-3">
									{deal.expectedCloseDate ? (
										<span className="text-muted-foreground">
											<LocalDay date={deal.expectedCloseDate} />
										</span>
									) : (
										<EmptyCellValue />
									)}
								</TableCell>
								<TableCell
									className="overflow-hidden px-3 py-3 text-right text-muted-foreground tabular-nums"
									title={deal.neverActive ? t("neverActive") : undefined}
								>
									{deal.daysSinceLastActivity}d
								</TableCell>
							</SimpleTableRow>
						);
					})
				)}
			</SimpleTable>
			<div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-xs">
				<span>{tableMeta(result, t, locale)}</span>
				<span>
					{t.rich("asOf", {
						date: () => <LocalDay date={result.asOf} />,
					})}
				</span>
			</div>
		</section>
	);
}

function Stage({ stage }: { stage: string }) {
	const known = DEAL_STAGES.find((candidate) => candidate === stage);
	return known ? (
		<DealStageIndicator stage={known} />
	) : (
		<span className="text-muted-foreground">{humaniseStage(stage)}</span>
	);
}

function tableTitle(
	result: DealListResult,
	t: ReturnType<typeof useTranslations>,
): string {
	const count = result.deals.length;
	if (count === 0) return t("titleNoMatch");

	const criteria = [
		result.criteria.status === "all" ? null : result.criteria.status,
		result.criteria.inactiveForDays === null ? null : t("staleCriterion"),
	].filter((entry): entry is string => Boolean(entry));

	return criteria.length === 0
		? t("titleCount", { count })
		: t("titleFiltered", { count, criteria: criteria.join(", ") });
}

function tableMeta(
	result: DealListResult,
	t: ReturnType<typeof useTranslations>,
	locale: string,
): string {
	const details = [
		t("metaCount", { count: result.deals.length }),
		pipelineTotal(locale, result.deals, t),
		result.criteria.inactiveForDays === null
			? null
			: t("metaInactive", { days: result.criteria.inactiveForDays }),
		result.hasMore ? t("metaMoreResults") : null,
	].filter((detail): detail is string => Boolean(detail));

	return details.join(" · ");
}

function humaniseStage(stage: string): string {
	return stage
		.toLowerCase()
		.split("_")
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");
}

function pipelineTotal(
	locale: string,
	deals: readonly DealListItem[],
	t: ReturnType<typeof useTranslations>,
): string | null {
	const currencies = new Set(deals.map((deal) => deal.currency));
	if (currencies.size !== 1) return null;

	const currency = currencies.values().next().value;
	if (!currency) return null;

	const amount = deals.reduce((sum, deal) => sum + (deal.amount ?? 0), 0);
	return t("metaPipeline", {
		amount: formatMoney(Math.round(amount * 100), currency, locale),
	});
}
