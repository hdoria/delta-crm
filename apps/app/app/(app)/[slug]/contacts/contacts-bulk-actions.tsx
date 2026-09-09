"use client";

import Archive from "@carbon/icons-react/es/Archive";
import Renew from "@carbon/icons-react/es/Renew";
import Undo from "@carbon/icons-react/es/Undo";
import {
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from "@crm/ui/components/dropdown-menu";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	BulkActionsMenu,
	BulkDeleteDialog,
	BulkOwnerMenu,
	useBulkReporter,
} from "@/components/crm/bulk-actions";
import { CompanyMenuSearch } from "@/components/crm/company-picker";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

export function ContactsBulkActions({
	ids,
	onDone,
	archived,
}: {
	ids: string[];
	onDone: () => void;
	archived: boolean;
}) {
	const t = useTranslations("contacts");
	const report = useBulkReporter();
	const trpc = useTRPC();
	const cache = useCrmCache();
	const users = useQuery(trpc.users.list.queryOptions());
	const [menuOpen, setMenuOpen] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const companySearch = useRef<HTMLInputElement>(null);

	const onError = (error: { message: string }) => toast.error(error.message);

	const assignOwner = useMutation(
		trpc.contacts.bulkAssignOwner.mutationOptions({
			onSuccess: async (result) => {
				await cache.contact();
				report(result, (count) => t("bulk.reassigned", { count }));
				onDone();
			},
			onError,
		}),
	);

	const setCompany = useMutation(
		trpc.contacts.bulkSetCompany.mutationOptions({
			onSuccess: async (result) => {
				await cache.contact();
				report(result, (count) => t("bulk.moved", { count }));
				onDone();
			},
			onError,
		}),
	);

	const enrich = useMutation(
		trpc.contacts.bulkEnrich.mutationOptions({
			onSuccess: async (result) => {
				await cache.contact();
				report(result, (count) => t("bulk.looking", { count }));
				onDone();
			},
			onError,
		}),
	);

	const archive = useMutation(
		trpc.contacts.bulkArchive.mutationOptions({
			onSuccess: async (result, variables) => {
				await cache.removedMany({ kind: "contact", ids: variables.ids });
				report(result, (count) => t("bulk.archivedToast", { count }));
				onDone();
			},
			onError,
		}),
	);

	const restore = useMutation(
		trpc.contacts.bulkRestore.mutationOptions({
			onSuccess: async (result) => {
				await cache.contact();
				report(result, (count) => t("bulk.restored", { count }));
				onDone();
			},
			onError,
		}),
	);

	const purge = useMutation(
		trpc.contacts.bulkPurge.mutationOptions({
			onSuccess: async (result, variables) => {
				await cache.removedMany({ kind: "contact", ids: variables.ids });
				report(result, (count) => t("bulk.deleted", { count }));
				setConfirming(false);
				onDone();
			},
			onError,
		}),
	);

	if (archived) {
		const pending = restore.isPending || purge.isPending;

		return (
			<>
				<BulkActionsMenu pending={pending}>
					<DropdownMenuGroup>
						<DropdownMenuItem onSelect={() => restore.mutate({ ids })}>
							<Undo />
							{t("bulk.restore")}
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem
							variant="destructive"
							onSelect={() => setConfirming(true)}
						>
							{t("bulk.deleteForever")}
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</BulkActionsMenu>

				<BulkDeleteDialog
					open={confirming}
					onOpenChange={setConfirming}
					title={t("bulk.deleteTitle", { count: ids.length })}
					description={t("bulk.deleteDescription")}
					onConfirm={() => purge.mutate({ ids })}
				/>
			</>
		);
	}

	const pending =
		assignOwner.isPending ||
		setCompany.isPending ||
		enrich.isPending ||
		archive.isPending;

	return (
		<BulkActionsMenu
			pending={pending}
			open={menuOpen}
			onOpenChange={setMenuOpen}
		>
			<BulkOwnerMenu
				users={users.data ?? []}
				unassignedLabel={t("bulk.unassignedOwner")}
				onSelect={(ownerId) => assignOwner.mutate({ ids, ownerId })}
			/>
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					{t("bulk.moveToCompany")}
				</DropdownMenuSubTrigger>
				<DropdownMenuSubContent
					className="w-64 p-0"
					onFocus={(event) => {
						if (event.target === event.currentTarget) {
							companySearch.current?.focus();
						}
					}}
				>
					<CompanyMenuSearch
						none={t("bulk.noCompany")}
						inputRef={companySearch}
						onSelect={(companyId) => {
							setMenuOpen(false);
							setCompany.mutate({ ids, companyId });
						}}
					/>
				</DropdownMenuSubContent>
			</DropdownMenuSub>
			<DropdownMenuGroup>
				<DropdownMenuItem onSelect={() => enrich.mutate({ ids })}>
					<Renew />
					{t("bulk.reenrich")}
				</DropdownMenuItem>
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<DropdownMenuGroup>
				<DropdownMenuItem onSelect={() => archive.mutate({ ids })}>
					<Archive />
					{t("bulk.archive")}
				</DropdownMenuItem>
			</DropdownMenuGroup>
		</BulkActionsMenu>
	);
}
