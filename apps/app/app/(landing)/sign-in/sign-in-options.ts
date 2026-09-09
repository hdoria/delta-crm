import { isLocalEmailLoginEnabled } from "@crm/auth/policy";
import { supabaseConfig } from "@crm/auth/supabase";
import { hasSignInAllowList } from "@crm/auth/workspace";
import { z } from "zod";
import { AUTH_SETTINGS_TIMEOUT_MS } from "@/lib/env";

export async function readSignInOptions(): Promise<{
	google: boolean;
	email: boolean;
}> {
	if (!hasSignInAllowList()) return { google: false, email: false };
	try {
		const { url, key } = supabaseConfig();
		const response = await fetch(`${url}/auth/v1/settings`, {
			headers: { apikey: key },
			cache: "no-store",
			signal: AbortSignal.timeout(AUTH_SETTINGS_TIMEOUT_MS),
		});
		if (!response.ok) return { google: false, email: false };
		const { external } = z
			.object({
				external: z.object({
					google: z.boolean().catch(false),
					email: z.boolean().catch(false),
				}),
			})
			.parse(await response.json());
		return {
			google: external.google,
			email: isLocalEmailLoginEnabled() && external.email,
		};
	} catch {
		return { google: false, email: false };
	}
}
