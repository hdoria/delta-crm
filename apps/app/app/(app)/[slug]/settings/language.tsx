"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@crm/ui/components/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { useLocale, useTranslations } from "next-intl";
import { useId, useTransition } from "react";
import { toast } from "sonner";
import { setLocale } from "@/i18n/actions";
import { I18N, LOCALE_LABELS } from "@/i18n/config";

export function Language() {
	const t = useTranslations("settings.language");
	const locale = useLocale();
	const selectId = useId();
	const [pending, startTransition] = useTransition();

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("title")}</CardTitle>
				<CardDescription>{t("description")}</CardDescription>
			</CardHeader>

			<CardContent>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={selectId}>{t("label")}</FieldLabel>
						<Select
							disabled={pending}
							value={locale}
							onValueChange={(next) =>
								startTransition(async () => {
									await setLocale(next);
									toast.success(t("saved"));
								})
							}
						>
							<SelectTrigger id={selectId}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{I18N.locales.map((value) => (
									<SelectItem key={value} value={value}>
										{LOCALE_LABELS[value]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				</FieldGroup>
			</CardContent>
		</Card>
	);
}
