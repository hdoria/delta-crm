import { supabaseConfig } from "@crm/auth/supabase";
import { hasSignInAllowList } from "@crm/auth/workspace";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { AUTH_SETTINGS_TIMEOUT_MS } from "@/lib/env";
import { getSession } from "@/lib/session";
import { SocialSignIn } from "./social-sign-in";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
	return (
		<AuthShell>
			<Suspense
				fallback={
					<AuthHeading
						title="Entre no Base CRM"
						description="Use sua conta Google para continuar."
					/>
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
	const configured = await googleConfigured();
	return (
		<>
			<AuthHeading
				title="Entre no Base CRM"
				description="Suas empresas, contatos e oportunidades em um só lugar."
			/>
			<SocialSignIn disabled={!configured} />
			{!configured && (
				<p className="text-center text-muted-foreground text-sm/5">
					O acesso pelo Google ainda está sendo configurado. Assim que estiver
					pronto, você poderá entrar por aqui.
				</p>
			)}
			{params.error && (
				<p role="alert" className="text-center text-destructive text-sm/5">
					Não foi possível entrar. Use uma conta Google autorizada e tente
					novamente.
				</p>
			)}
			<p className="text-center text-muted-foreground text-sm/5">
				O Google é usado apenas para identificar sua conta. Não pedimos acesso
				ao Gmail nem ao Calendar.
			</p>
		</>
	);
}

async function googleConfigured(): Promise<boolean> {
	if (!hasSignInAllowList()) return false;
	try {
		const { url, key } = supabaseConfig();
		const response = await fetch(`${url}/auth/v1/settings`, {
			headers: { apikey: key },
			cache: "no-store",
			signal: AbortSignal.timeout(AUTH_SETTINGS_TIMEOUT_MS),
		});
		if (!response.ok) return false;
		return z
			.object({ external: z.object({ google: z.boolean() }) })
			.parse(await response.json()).external.google;
	} catch {
		return false;
	}
}
