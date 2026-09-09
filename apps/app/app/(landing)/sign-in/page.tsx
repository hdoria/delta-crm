import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/session";
import { PasswordSignIn } from "./password-sign-in";
import { readSignInOptions } from "./sign-in-options";
import { SocialSignIn } from "./social-sign-in";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("signIn");
	return { title: t("title") };
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
	const t = useTranslations("signIn");

	return (
		<AuthShell>
			<Suspense
				fallback={
					<AuthHeading title={t("heading")} description={t("loading")} />
				}
			>
				<SignIn searchParams={searchParams} />
			</Suspense>
		</AuthShell>
	);
}

async function SignIn({
	searchParams,
}: Pick<PageProps<"/sign-in">, "searchParams">) {
	const [session, params] = await Promise.all([getSession(), searchParams]);
	if (session) redirect("/");
	const providers = await readSignInOptions();
	const t = await getTranslations("signIn");
	return (
		<>
			<AuthHeading title={t("heading")} description={t("description")} />
			{providers.email && <PasswordSignIn />}
			{providers.google && <SocialSignIn />}
			{!providers.google && (
				<p className="text-center text-muted-foreground text-sm/5">
					{providers.email ? t("emailOnly") : t("notConfigured")}
				</p>
			)}
			{params.error && (
				<p role="alert" className="text-center text-destructive text-sm/5">
					{t("failed")}
				</p>
			)}
			{providers.google && (
				<p className="text-center text-muted-foreground text-sm/5">
					{t("googleNote")}
				</p>
			)}
		</>
	);
}
