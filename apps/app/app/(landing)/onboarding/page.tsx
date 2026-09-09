import { DEFAULT_WORKSPACE_NAME } from "@crm/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { requireMailboxAccess } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("onboarding");
	return { title: t("title") };
}

export default async function OnboardingPage() {
	await requireMailboxAccess();
	const t = await getTranslations("onboarding");

	return (
		<AuthShell>
			<AuthHeading title={t("heading")} description={t("description")} />

			<OnboardingForm placeholder={DEFAULT_WORKSPACE_NAME} />
		</AuthShell>
	);
}
