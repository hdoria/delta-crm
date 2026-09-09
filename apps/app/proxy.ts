import { SESSION_COOKIE_NAME } from "@crm/auth/cookies";
import { allowsSupabaseUser } from "@crm/auth/policy";
import { createServerSupabaseClient } from "@crm/auth/supabase";
import { type NextRequest, NextResponse } from "next/server";
import { isMarketing } from "@/lib/env";
import {
	ONBOARDING_PATH,
	RESEARCH_PATH,
	readWorkspaceGate,
} from "@/lib/onboarding";
import { workspaceUrl } from "@/lib/workspace-url";

const LANDING_PATH = "/";

const SIGN_IN_PATH = "/sign-in";

const UNGATED = ["/grant-access", "/eve"];

const ANONYMOUS = ["/t"];

const SECTIONS = ["/companies", "/contacts", "/deals", "/settings"];

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (isAnonymous(pathname) || pathname === "/auth/callback")
		return NextResponse.next();
	let response = NextResponse.next({ request });
	const supabase = createServerSupabaseClient({
		getAll: () => request.cookies.getAll(),
		setAll: (cookies) => {
			for (const { name, value, options } of cookies) {
				if (options?.maxAge === 0) request.cookies.delete(name);
				else request.cookies.set(name, value);
			}
			response = NextResponse.next({ request });
			for (const { name, value, options } of cookies)
				response.cookies.set(name, value, options);
		},
	});
	const finish = (result: NextResponse) => {
		for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
		result.headers.set("Cache-Control", "private, no-store");
		return result;
	};
	let allowed = false;
	try {
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();
		allowed = Boolean(!error && user && allowsSupabaseUser(user));
		if (user && !allowed) await supabase.auth.signOut({ scope: "local" });
	} catch {
		const invalidCookies = request.cookies
			.getAll()
			.filter(
				({ name }) =>
					name === SESSION_COOKIE_NAME ||
					name.startsWith(`${SESSION_COOKIE_NAME}.`),
			);
		for (const { name } of invalidCookies) request.cookies.delete(name);
		response = NextResponse.next({ request });
		for (const { name } of invalidCookies)
			response.cookies.set(name, "", { path: "/", maxAge: 0 });
	}
	if (!allowed) {
		return finish(
			pathname === SIGN_IN_PATH || isPublic(pathname)
				? response
				: NextResponse.redirect(new URL(SIGN_IN_PATH, request.nextUrl)),
		);
	}
	if (pathname === SIGN_IN_PATH) return finish(response);
	if (isUngated(pathname)) return finish(response);
	const workspace = await readWorkspaceGate(request);
	if (workspace.gate === "required")
		return finish(sendTo(ONBOARDING_PATH, request));
	if (workspace.gate !== "settled" || !workspace.slug) return finish(response);
	return finish(sendTo(appPath(pathname, workspace.slug), request));
}

function appPath(pathname: string, slug: string): string {
	if (pathname === LANDING_PATH || isSetup(pathname)) {
		return workspaceUrl(slug);
	}

	if (SECTIONS.some((section) => isUnder(pathname, section))) {
		return workspaceUrl(slug, pathname);
	}

	const [first, ...rest] = pathname.slice(1).split("/");

	if (first === slug) return pathname;

	return workspaceUrl(slug, rest.length ? `/${rest.join("/")}` : "/");
}

function isUnder(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublic(pathname: string): boolean {
	return pathname === LANDING_PATH && isMarketing();
}

function isUngated(pathname: string): boolean {
	return UNGATED.some((prefix) => isUnder(pathname, prefix));
}

function isAnonymous(pathname: string): boolean {
	return ANONYMOUS.some((prefix) => isUnder(pathname, prefix));
}

function isSetup(pathname: string): boolean {
	return pathname === ONBOARDING_PATH || pathname === RESEARCH_PATH;
}

function sendTo(path: string, request: NextRequest): NextResponse {
	if (request.nextUrl.pathname === path) return NextResponse.next({ request });

	const url = new URL(path, request.nextUrl);
	url.search = request.nextUrl.search;

	return NextResponse.redirect(url);
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp|webmanifest)$).*)",
	],
};
