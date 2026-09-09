import { auth } from "@crm/auth";
import { createServerSupabaseClient } from "@crm/auth/supabase";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const response = NextResponse.redirect(new URL("/", request.url));
	response.headers.set("Cache-Control", "private, no-store");
	const supabase = createServerSupabaseClient({
		getAll: () => request.cookies.getAll(),
		setAll: (cookies) => {
			for (const { name, value, options } of cookies) {
				if (options?.maxAge === 0) request.cookies.delete(name);
				else request.cookies.set(name, value);
				response.cookies.set(name, value, options);
			}
		},
	});
	const code = request.nextUrl.searchParams.get("code");
	try {
		if (!code || request.nextUrl.searchParams.has("error"))
			throw new Error("OAuth callback rejected");
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (error) throw error;
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) throw new Error("Account not permitted");
		return response;
	} catch {
		await supabase.auth.signOut({ scope: "local" });
		const failure = NextResponse.redirect(
			new URL("/sign-in?error=authentication", request.url),
		);
		failure.headers.set("Cache-Control", "private, no-store");
		for (const cookie of response.cookies.getAll()) failure.cookies.set(cookie);
		return failure;
	}
}
