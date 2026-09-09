"use client";

import Copy from "@carbon/icons-react/es/Copy";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function CopyValue({ value, label }: { value: string; label: string }) {
	const t = useTranslations("settings.copyValue");
	const lowerLabel = label.toLowerCase();

	const unavailable = () => toast.error(t("copyFailed", { label: lowerLabel }));

	return (
		<Button
			variant="ghost"
			size="icon"
			type="button"
			onClick={() => {
				const clipboard = navigator.clipboard;

				if (!clipboard) {
					unavailable();
					return;
				}

				clipboard
					.writeText(value)
					.then(() => toast.success(t("copied", { label })))
					.catch(unavailable);
			}}
		>
			<Icon icon={Copy} />
			<span className="sr-only">{t("copyLabel", { label: lowerLabel })}</span>
		</Button>
	);
}
