import { type CookieMethodsServer, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SESSION_COOKIE_NAME } from "./cookie-name";
import { accessTokenFromCookies } from "./cookies";

export function supabaseConfig() {
	const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_ANON_KEY ??
		process.env.SUPABASE_PUBLISHABLE_KEY ??
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key)
		throw new Error("Supabase URL and publishable key are not configured.");
	return { url, key };
}

export function createServerSupabaseClient(cookies: CookieMethodsServer) {
	const { url, key } = supabaseConfig();
	return createServerClient(url, key, {
		cookies: {
			...cookies,
			async getAll() {
				const all = (await cookies.getAll()) ?? [];
				const own = all.filter(
					({ name }) =>
						name === SESSION_COOKIE_NAME ||
						name.startsWith(`${SESSION_COOKIE_NAME}.`),
				);
				const header = own
					.map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
					.join("; ");
				if (own.length && !accessTokenFromCookies(header)) {
					await cookies.setAll?.(
						own.map(({ name }) => ({
							name,
							value: "",
							options: { path: "/", maxAge: 0 },
						})),
					);
					return all.filter((cookie) => !own.includes(cookie));
				}
				return all;
			},
		},
		cookieOptions: { name: SESSION_COOKIE_NAME },
	});
}

export function createTokenSupabaseClient() {
	const { url, key } = supabaseConfig();
	return createClient(url, key, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});
}

export function fromNodeHeaders(
	source: Record<string, string | string[] | undefined>,
): Headers {
	const headers = new Headers();
	for (const [name, value] of Object.entries(source)) {
		if (Array.isArray(value))
			for (const item of value) headers.append(name, item);
		else if (value !== undefined) headers.set(name, value);
	}
	return headers;
}
