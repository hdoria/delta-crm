"use client";

import Archive from "@carbon/icons-react/es/Archive";
import { Button } from "@crm/ui/components/button";
import {
	DataTable,
	type DataTableColumn,
	type DataTableFacet,
} from "@crm/ui/components/data-table";
import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import { useTableSelection } from "@crm/ui/hooks/use-table-selection";
import { formatMoney } from "@crm/ui/lib/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { CLOSING_WINDOWS } from "@/components/crm/closing-window";
import { CompanyCell } from "@/components/crm/company-cell";
import { useFieldColumns } from "@/components/crm/fields/field-columns";
import { useFieldFacets } from "@/components/crm/fields/field-facets";
import { OwnerCell } from "@/components/crm/owner-cell";
import { usePrefetchRecord } from "@/components/crm/record-sheet/record-prefetch";
import { useOpenRecord } from "@/components/crm/record-sheet/record-stack";
import { DealStageMenu } from "@/components/crm/stage-change";
import { ListSearch } from "@/components/data-table/list-search";
import { useTableQuery } from "@/components/data-table/use-table-query";
import { LocalDay, LocalRelativeTime } from "@/components/local-date-time";
import { DEAL_STAGES } from "@/lib/deal-stage";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { DealsBulkActions } from "./deals-bulk-actions";
import { dealsSearchParams } from "./deals-search-params";

type DealRow = RouterOutputs["deals"]["list"]["rows"][number];

function buildColumns(
	t: (key: string) => string,
	locale: string,
): DataTableColumn<DealRow>[] {
	return [
		{
			id: "name",
			header: t("table.columns.deal"),
			sortable: true,
			hideable: false,
			width: "w-[24%]",
			cell: (row) => <span className="truncate font-medium">{row.name}</span>,
		},
		{
			id: "company",
			header: t("table.columns.company"),
			sortable: true,
			width: "w-[18%]",
			cell: (row) => <CompanyCell company={row.company} />,
		},
		{
			id: "stage",
			header: t("table.columns.stage"),
			sortable: true,
			width: "w-[18%]",
			cell: (row) => <DealStageMenu dealId={row.id} stage={row.stage} />,
		},
		{
			id: "amount",
			header: t("table.columns.amount"),
			sortable: true,
			align: "right",
			width: "w-[12%]",
			hideBelow: "sm",
			cell: (row) =>
				row.amountCents === null ? (
					<EmptyCellValue />
				) : (
					<span className="tabular-nums">
						{formatMoney(row.amountCents, row.currency, locale)}
					</span>
				),
		},
		{
			id: "owner",
			header: t("table.columns.owner"),
			sortable: true,
			width: "w-[14%]",
			hideBelow: "md",
			cell: (row) => <OwnerCell owner={row.owner} />,
		},
		{
			id: "expectedCloseDate",
			header: t("table.columns.closeDate"),
			sortable: true,
			width: "w-[12%]",
			hideBelow: "lg",
			cell: (row) =>
				row.expectedCloseDate ? (
					<span className="text-muted-foreground">
						<LocalDay date={row.expectedCloseDate} />
					</span>
				) : (
					<EmptyCellValue />
				),
		},
		{
			id: "createdAt",
			header: t("table.columns.created"),
			label: t("table.columns.createdLabel"),
			sortable: true,
			align: "right",
			width: "w-[10%]",
			defaultHidden: true,
			cell: (row) => (
				<span className="text-muted-foreground">
					<LocalRelativeTime date={row.createdAt} />
				</span>
			),
		},
		{
			id: "lastActivity",
			header: t("table.columns.lastActivity"),
			sortable: true,
			align: "right",
			width: "w-[12%]",
			hideBelow: "lg",
			cell: (row) => (
				<span className="text-muted-foreground">
					{row.lastActivityAt ? (
						<LocalRelativeTime date={row.lastActivityAt} />
					) : (
						<EmptyCellValue />
					)}
				</span>
			),
		},
	];
}

function buildArchivedColumn(
	t: (key: string) => string,
): DataTableColumn<DealRow> {
	return {
		id: "archivedAt",
		header: t("table.columns.archived"),
		label: t("table.columns.archivedLabel"),
		sortable: true,
		align: "right",
		width: "w-[12%]",
		cell: (row) => (
			<span className="text-muted-foreground">
				{row.archivedAt ? (
					<LocalRelativeTime date={row.archivedAt} />
				) : (
					<EmptyCellValue />
				)}
			</span>
		),
	};
}

export function DealsTable() {
	const locale = useLocale();
	const t = useTranslations("deals");
	const stageLabel = useTranslations("dealStage");
	const openRecord = useOpenRecord();
	const trpc = useTRPC();
	const prefetchRecord = usePrefetchRecord();
	const { query, input, setArchived } = useTableQuery(dealsSearchParams);

	const deals = useQuery({
		...trpc.deals.list.queryOptions(input),
		placeholderData: (previous) => previous,
	});
	const users = useQuery(trpc.users.list.queryOptions());

	const rows = deals.data?.rows ?? [];
	const selection = useTableSelection(
		useMemo(() => rows.map((row) => row.id), [rows]),
	);
	const settledIds = useMemo(() => {
		const matching = new Set(
			rows
				.filter((row) => Boolean(row.archivedAt) === input.archived)
				.map((row) => row.id),
		);
		return selection.ids.filter((id) => matching.has(id));
	}, [rows, input.archived, selection.ids]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: clearing on archived-mode change is the entire purpose of this effect.
	useEffect(() => {
		selection.clear();
	}, [input.archived]);

	const toggleArchived = (next: boolean) => {
		selection.clear();
		if (!next && query.sort === "archivedAt") query.setSort("");
		setArchived(next);
	};

	const facetCounts = deals.data?.facetCounts;
	const fieldFacets = useFieldFacets("DEAL", facetCounts);

	const facets: DataTableFacet[] = [
		{
			id: "owner",
			label: t("table.facets.owner"),
			options: (users.data ?? []).flatMap((user) =>
				(facetCounts?.owner?.[user.id] ?? 0) > 0
					? [{ value: user.id, label: user.name }]
					: [],
			),
		},
		{
			id: "stage",
			label: t("table.facets.stage"),
			options: DEAL_STAGES.flatMap((value) =>
				(facetCounts?.stage?.[value] ?? 0) > 0
					? [{ value, label: stageLabel(value) }]
					: [],
			),
		},
		{
			id: "closing",
			label: t("table.facets.closing"),
			options: CLOSING_WINDOWS.flatMap((value) =>
				(facetCounts?.closing?.[value] ?? 0) > 0
					? [{ value, label: t(`table.closingWindow.${value}`) }]
					: [],
			),
		},
		...fieldFacets,
	];

	const openValueCents = deals.data?.openValueCents;
	const reportingCurrency = deals.data?.reportingCurrency;
	const unconverted = deals.data?.unconverted;
	const uncounted = unconverted?.count ?? 0;
	const openPipelineCents = openValueCents ?? (uncounted > 0 ? 0 : null);

	const fieldColumns = useFieldColumns<DealRow>("DEAL");
	const columns = useMemo(
		() =>
			input.archived
				? [...buildColumns(t, locale), buildArchivedColumn(t), ...fieldColumns]
				: [...buildColumns(t, locale), ...fieldColumns],
		[fieldColumns, input.archived, t],
	);

	return (
		<DataTable
			query={query}
			search={<ListSearch placeholder={t("table.search")} />}
			actions={
				<Button
					variant={input.archived ? "contrast" : "outline"}
					size="sm"
					className="justify-start sm:justify-center"
					onClick={() => toggleArchived(!input.archived)}
				>
					<Archive data-icon="inline-start" />
					{t("table.archivedFilter")}
				</Button>
			}
			columns={columns}
			rows={rows}
			total={deals.data?.total ?? 0}
			facetCounts={facetCounts}
			facets={facets}
			tabs={{
				id: "status",
				allLabel: t("table.tabs.all"),
				options: [
					{ value: "open", label: t("table.tabs.open") },
					{ value: "closed", label: t("table.tabs.closed") },
				],
			}}
			selection={{
				state: selection,
				actions: (
					<DealsBulkActions
						ids={settledIds}
						onDone={selection.clear}
						archived={input.archived}
					/>
				),
				rowLabel: (row) => row.name,
			}}
			getRowId={(row) => row.id}
			loading={deals.isFetching}
			onRowHover={(row) => prefetchRecord({ kind: "deal", id: row.id })}
			onRowClick={(row) => openRecord({ kind: "deal", id: row.id })}
			empty={
				input.archived ? t("table.empty.archived") : t("table.empty.default")
			}
			meta={
				input.archived || openPipelineCents === null ? undefined : (
					<span>
						{t("table.meta.count", { count: deals.data?.total ?? 0 })} ·{" "}
						<span className="tabular-nums">
							{formatMoney(openPipelineCents, reportingCurrency, locale)}
						</span>{" "}
						{t("table.meta.openPipeline")}
						{unconverted && unconverted.count > 0 ? (
							<span className="text-muted-foreground">
								{" "}
								·{" "}
								{t("table.meta.notCounted", {
									count: unconverted.count,
									currencies: unconverted.currencies.join(", "),
								})}
							</span>
						) : null}
					</span>
				)
			}
		/>
	);
}
