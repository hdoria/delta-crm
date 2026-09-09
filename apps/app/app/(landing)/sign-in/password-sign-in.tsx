"use client";

import { createBrowserSupabaseClient } from "@crm/auth/client";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { Label } from "@crm/ui/components/label";
import { Spinner } from "@crm/ui/components/spinner";
import { type FormEvent, useId, useState } from "react";

export function PasswordSignIn() {
	const emailId = useId();
	const passwordId = useId();
	const errorId = useId();
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		const form = new FormData(event.currentTarget);
		const email = String(form.get("email") ?? "").trim();
		const password = String(form.get("password") ?? "");
		setPending(true);
		setFailed(false);

		try {
			const { data, error } =
				await createBrowserSupabaseClient().auth.signInWithPassword({
					email,
					password,
				});
			if (error || !data.session) throw new Error("Sign-in failed");
			window.location.assign("/");
		} catch {
			setFailed(true);
			setPending(false);
		}
	}

	return (
		<form
			method="post"
			onSubmit={handleSubmit}
			className="flex flex-col gap-4"
			aria-busy={pending}
		>
			<div className="flex flex-col gap-2">
				<Label htmlFor={emailId}>E-mail</Label>
				<Input
					id={emailId}
					name="email"
					type="email"
					autoComplete="email"
					autoCapitalize="none"
					required
					disabled={pending}
					aria-invalid={failed}
					aria-describedby={failed ? errorId : undefined}
				/>
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor={passwordId}>Senha</Label>
				<Input
					id={passwordId}
					name="password"
					type="password"
					autoComplete="current-password"
					required
					disabled={pending}
					aria-invalid={failed}
					aria-describedby={failed ? errorId : undefined}
				/>
			</div>
			{failed && (
				<p id={errorId} role="alert" className="text-destructive text-sm/5">
					Não foi possível entrar. Confira seu e-mail e senha e tente novamente.
				</p>
			)}
			<Button type="submit" disabled={pending}>
				{pending && <Spinner data-icon="inline-start" />}
				{pending ? "Entrando..." : "Entrar com e-mail e senha"}
			</Button>
		</form>
	);
}
