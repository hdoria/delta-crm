"use client";

import { createBrowserSupabaseClient } from "@crm/auth/client";
import GoogleLogo from "@crm/ui/components/brand-logos/google";
import { Button } from "@crm/ui/components/button";
import { Spinner } from "@crm/ui/components/spinner";
import { useState } from "react";
import { toast } from "sonner";

export function SocialSignIn({ disabled = false }: { disabled?: boolean }) {
	const [pending, setPending] = useState(false);
	async function handleClick() {
		setPending(true);
		try {
			const { error } =
				await createBrowserSupabaseClient().auth.signInWithOAuth({
					provider: "google",
					options: {
						redirectTo: `${window.location.origin}/auth/callback`,
						scopes: "openid email profile",
					},
				});
			if (error) throw error;
		} catch {
			setPending(false);
			toast.error("Não foi possível conectar ao Google. Tente novamente.");
		}
	}
	return (
		<Button
			className="w-full"
			disabled={disabled || pending}
			onClick={handleClick}
			type="button"
			variant="outline"
		>
			{pending ? (
				<Spinner data-icon="inline-start" />
			) : (
				<GoogleLogo data-icon="inline-start" className="size-4" />
			)}
			Continuar com Google
		</Button>
	);
}
