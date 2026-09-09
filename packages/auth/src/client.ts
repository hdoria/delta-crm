"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SESSION_COOKIE_NAME } from "./cookie-name";

export function createBrowserSupabaseClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key)
		throw new Error("Supabase URL and publishable key are not configured.");
	return createBrowserClient(url, key, {
		cookieOptions: { name: SESSION_COOKIE_NAME },
	});
}

export async function signOut() {
	return createBrowserSupabaseClient().auth.signOut();
}
export async function getSession() {
	return createBrowserSupabaseClient().auth.getSession();
}
type DisabledIntegrationOptions = {
	provider?: string;
	providerId?: string;
	scopes?: string[];
	callbackURL?: string;
	errorCallbackURL?: string;
};
const unavailable = async (_options?: DisabledIntegrationOptions) => ({
	error: {
		message:
			"Esta integração não está habilitada no Base CRM. O acesso usa somente Google pelo Supabase.",
	},
});
export const signIn = {
	async social(options: { provider: string; callbackURL?: string }) {
		if (options.provider !== "google") return unavailable();
		return createBrowserSupabaseClient().auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo:
					options.callbackURL ?? `${window.location.origin}/auth/callback`,
			},
		});
	},
	sso: unavailable,
};
export const authClient = {
	signOut,
	getSession,
	signIn,
	linkSocial: unavailable,
	oauth2: { link: unavailable },
};
export type AuthClient = typeof authClient;
