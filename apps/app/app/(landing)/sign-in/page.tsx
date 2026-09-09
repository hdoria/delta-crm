import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/session";
import { PasswordSignIn } from "./password-sign-in";
import { readSignInOptions } from "./sign-in-options";
import { SocialSignIn } from "./social-sign-in";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
	return (
		<AuthShell>
			<Suspense
				fallback={
					<AuthHeading
						title="Entre no Base CRM"
						description="Carregando as opções de acesso."
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
	const providers = await readSignInOptions();
	return (
		<>
			<AuthHeading
				title="Entre no Base CRM"
				description="Suas empresas, contatos e oportunidades em um só lugar."
			/>
			{providers.email && <PasswordSignIn />}
			{providers.google && <SocialSignIn />}
			{!providers.google && (
				<p className="text-center text-muted-foreground text-sm/5">
					{providers.email
						? "Use e-mail e senha para entrar. O acesso pelo Google será habilitado depois."
						: "O acesso ainda está sendo configurado. Aguarde a liberação da sua conta."}
				</p>
			)}
			{params.error && (
				<p role="alert" className="text-center text-destructive text-sm/5">
					Não foi possível entrar. Confira os dados da sua conta e tente
					novamente.
				</p>
			)}
			{providers.google && (
				<p className="text-center text-muted-foreground text-sm/5">
					O Google é usado apenas para identificar sua conta. Não pedimos acesso
					ao Gmail nem ao Calendar.
				</p>
			)}
		</>
	);
}
