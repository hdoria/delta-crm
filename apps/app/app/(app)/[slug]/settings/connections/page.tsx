import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
	PageShell,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellTitle,
} from "@/components/page-shell";
import { BRAND } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("settings.connections.page");
	return { title: t("title") };
}

export default async function ConnectionsPage() {
	const t = await getTranslations("settings.connections.page");

	return (
		<PageShell>
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>{t("title")}</PageShellTitle>
					<PageShellDescription>
						{t("description", { appName: BRAND.appName })}
					</PageShellDescription>
				</PageShellHeading>
			</PageShellHeader>
		</PageShell>
	);
}
