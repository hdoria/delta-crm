import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { readResearchGate, readWorkspaceGate } from "../lib/onboarding";
import { proxy } from "../proxy";

const SLUG = "base-crm";
const SUPABASE_URL = "https://base-crm-tests.supabase.co";
const COOKIE_NAME = "sb-base-crm-auth-token";
const USER_ID = "d57e2d16-5b5a-4c71-8d93-e80544e41022";
const GOOGLE_USER = {
	id: USER_ID,
	aud: "authenticated",
	role: "authenticated",
	email: "teacher@base-crm.example",
	email_confirmed_at: "2026-09-09T00:00:00.000Z",
	created_at: "2026-09-09T00:00:00.000Z",
	app_metadata: { provider: "google", providers: ["google"] },
	user_metadata: { name: "Teacher Demo" },
	identities: [
		{ id: USER_ID, user_id: USER_ID, identity_id: USER_ID, provider: "google" },
	],
	is_anonymous: false,
};

function accessToken(expiresAt: number, id = "original") {
	const encode = (data: Record<string, string | number>) =>
		Buffer.from(JSON.stringify(data)).toString("base64url");
	return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: USER_ID, aud: "authenticated", exp: expiresAt, jti: id })}.test-signature`;
}

function session(expiresAt: number, id = "original") {
	return {
		access_token: accessToken(expiresAt, id),
		refresh_token: `${id}-refresh-token`,
		token_type: "bearer",
		expires_in: 3600,
		expires_at: expiresAt,
		user: GOOGLE_USER,
	};
}

function sessionCookie(expired = false) {
	const expiresAt = Math.floor(Date.now() / 1000) + (expired ? -60 : 3600);
	return `${COOKIE_NAME}=base64-${Buffer.from(JSON.stringify(session(expiresAt))).toString("base64url")}`;
}

function malformedUtf8Cookie() {
	const expiresAt = Math.floor(Date.now() / 1000) + 3600;
	const value = JSON.stringify(session(expiresAt));
	const marker = value.indexOf("Teacher Demo");
	const bytes = Buffer.concat([
		Buffer.from(value.slice(0, marker)),
		Buffer.from([0xff]),
		Buffer.from(value.slice(marker + "Teacher Demo".length)),
	]);
	return `${COOKIE_NAME}=base64-${bytes.toString("base64url")}`;
}

const SESSION_COOKIE = sessionCookie();
const realFetch = globalThis.fetch;
const savedEnv = Object.fromEntries(
	[
		"SUPABASE_URL",
		"SUPABASE_ANON_KEY",
		"ALLOWED_SIGN_IN",
		"IS_MARKETING",
		"LOCAL_EMAIL_LOGIN_ENABLED",
	].map((name) => [name, process.env[name]]),
);

beforeEach(() => {
	process.env.SUPABASE_URL = SUPABASE_URL;
	process.env.SUPABASE_ANON_KEY = "public-key-for-http-stub";
	process.env.ALLOWED_SIGN_IN = GOOGLE_USER.email;
	process.env.LOCAL_EMAIL_LOGIN_ENABLED = "false";
	marketing(undefined);
	stub(async () => {
		throw new Error("Unexpected HTTP request");
	});
});

afterEach(() => {
	globalThis.fetch = realFetch;
	for (const [name, value] of Object.entries(savedEnv)) {
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	}
});

function marketing(value: string | undefined) {
	if (value === undefined) delete process.env.IS_MARKETING;
	else process.env.IS_MARKETING = value;
}

function stub(handler: (url: string, init?: RequestInit) => Promise<Response>) {
	globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) =>
		handler(
			input instanceof Request ? input.url : String(input),
			init,
		)) as unknown as typeof fetch;
}

type HttpFixture =
	| null
	| boolean
	| number
	| string
	| HttpFixture[]
	| { [key: string]: HttpFixture };

type GateResponse =
	| { result: { data: HttpFixture } }
	| { error: { message: string } };

function json(body: HttpFixture, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"x-supabase-api-version": "2024-01-01",
		},
	});
}

function answerWith(body: GateResponse, status = 200) {
	stub(async () => json(body, status));
}

const workspace = (data: {
	onboarded: boolean;
	canRename: boolean;
	slug?: string;
}) => ({ result: { data: { slug: SLUG, ...data } } });

const researchKey = (configured: boolean) => ({
	result: { data: { configured, hint: configured ? "••••9876" : null } },
});

function setup({
	onboarded = true,
	canRename = true,
	configured = true,
	slug = SLUG,
	user = GOOGLE_USER,
	authStatus = 200,
	workspaceUnavailable = false,
	refreshStatus = 200,
}: {
	onboarded?: boolean;
	canRename?: boolean;
	configured?: boolean;
	slug?: string;
	user?: typeof GOOGLE_USER;
	authStatus?: number;
	workspaceUnavailable?: boolean;
	refreshStatus?: number;
} = {}) {
	const calls = {
		workspace: 0,
		research: 0,
		auth: 0,
		refresh: 0,
		logout: 0,
		forwardedCookies: [] as string[],
	};

	stub(async (url, init) => {
		if (url.startsWith(`${SUPABASE_URL}/auth/v1/user`)) {
			calls.auth += 1;
			return authStatus === 200
				? json(user)
				: json(
						{ code: "session_not_found", message: "Session revoked" },
						authStatus,
					);
		}
		if (url.startsWith(`${SUPABASE_URL}/auth/v1/token`)) {
			calls.refresh += 1;
			return refreshStatus === 200
				? json({
						...session(Math.floor(Date.now() / 1000) + 3600, "renewed"),
						user,
					})
				: json(
						{
							code: "refresh_token_not_found",
							message: "Refresh token revoked",
						},
						refreshStatus,
					);
		}
		if (url.startsWith(`${SUPABASE_URL}/auth/v1/logout`)) {
			calls.logout += 1;
			return new Response(null, { status: 204 });
		}
		if (url.includes("workspace.get")) {
			calls.workspace += 1;
			calls.forwardedCookies.push(
				new Headers(init?.headers).get("cookie") ?? "",
			);
			if (workspaceUnavailable) throw new Error("connect ECONNREFUSED");
			return json(workspace({ onboarded, canRename, slug }));
		}
		if (url.includes("settings.researchKey")) {
			calls.research += 1;
			return json(researchKey(configured));
		}
		throw new Error(`Unexpected HTTP request: ${new URL(url).pathname}`);
	});

	return calls;
}

function request(pathname: string, cookies: string[] = []) {
	return new NextRequest(new URL(pathname, "http://localhost:3000"), {
		headers: cookies.length ? { cookie: cookies.join("; ") } : {},
	});
}

function redirectedTo(response: Response): string | null {
	const location = response.headers.get("location");

	return location ? new URL(location).pathname : null;
}

async function gateOf(pathname: string) {
	return (await readWorkspaceGate(request(pathname, [SESSION_COOKIE]))).gate;
}

describe("readWorkspaceGate", () => {
	it("reads the answer out of a plain tRPC envelope", async () => {
		answerWith(workspace({ onboarded: false, canRename: true }));

		expect(await gateOf("/")).toBe("required");
	});

	it("settles for someone who could not answer the form anyway", async () => {
		answerWith(workspace({ onboarded: false, canRename: false }));

		expect(await gateOf("/")).toBe("settled");
	});

	it("carries the slug the app is served under", async () => {
		answerWith(workspace({ onboarded: true, canRename: true }));

		expect(await readWorkspaceGate(request("/", [SESSION_COOKIE]))).toEqual({
			gate: "settled",
			slug: SLUG,
		});
	});

	it("is unknown rather than required when the API cannot be read", async () => {
		answerWith({ error: { message: "UNAUTHORIZED" } }, 401);
		expect(await gateOf("/")).toBe("unknown");

		stub(async () => {
			throw new Error("connect ECONNREFUSED");
		});
		expect(await gateOf("/")).toBe("unknown");

		answerWith({ result: { data: { nothing: "useful" } } });
		expect(await gateOf("/")).toBe("unknown");
	});
});

describe("readResearchGate", () => {
	it("is settled once a key is saved, and required until then", async () => {
		answerWith(researchKey(true));
		expect(await readResearchGate(request("/", [SESSION_COOKIE]))).toBe(
			"settled",
		);

		answerWith(researchKey(false));
		expect(await readResearchGate(request("/", [SESSION_COOKIE]))).toBe(
			"required",
		);
	});

	it("is unknown rather than required when the API cannot be read", async () => {
		stub(async () => {
			throw new Error("connect ECONNREFUSED");
		});

		expect(await readResearchGate(request("/", [SESSION_COOKIE]))).toBe(
			"unknown",
		);
	});
});

describe("proxy", () => {
	it("shows a stranger the landing page and nothing behind it", async () => {
		marketing("true");

		expect(redirectedTo(await proxy(request("/")))).toBeNull();
		expect(redirectedTo(await proxy(request("/sign-in")))).toBeNull();
		expect(redirectedTo(await proxy(request(`/${SLUG}`)))).toBe("/sign-in");
		expect(redirectedTo(await proxy(request(`/${SLUG}/companies`)))).toBe(
			"/sign-in",
		);
	});

	it("sends a stranger to sign in when the install has no landing page", async () => {
		marketing(undefined);

		expect(redirectedTo(await proxy(request("/")))).toBe("/sign-in");
		expect(redirectedTo(await proxy(request("/sign-in")))).toBeNull();
	});

	it("never aims a redirect at the sign-in page itself", async () => {
		marketing(undefined);
		setup({ onboarded: false, configured: false });

		expect(redirectedTo(await proxy(request("/sign-in")))).toBeNull();
		expect(
			redirectedTo(await proxy(request("/sign-in", [SESSION_COOKIE]))),
		).toBeNull();
		expect(
			redirectedTo(await proxy(request("/sign-in?method=google"))),
		).toBeNull();
	});

	it("reads the flag on every request, and only the literal true turns it on", async () => {
		marketing("false");
		expect(redirectedTo(await proxy(request("/")))).toBe("/sign-in");

		marketing("1");
		expect(redirectedTo(await proxy(request("/")))).toBe("/sign-in");

		marketing("true");
		expect(redirectedTo(await proxy(request("/")))).toBeNull();
	});

	it("ignores a neighbour's cookie from the parent domain", async () => {
		setup();

		expect(
			redirectedTo(
				await proxy(
					request(`/${SLUG}/companies`, [
						"better-auth.session_token=someone.else",
					]),
				),
			),
		).toBe("/sign-in");
	});

	it("gates a signed-in rep who has not answered the form", async () => {
		setup({ onboarded: false });

		expect(
			redirectedTo(
				await proxy(request(`/${SLUG}/companies`, [SESSION_COOKIE])),
			),
		).toBe("/onboarding");
	});

	it("lets the form itself render", async () => {
		setup({ onboarded: false });

		expect(
			redirectedTo(await proxy(request("/onboarding", [SESSION_COOKIE]))),
		).toBeNull();
	});

	it("asks again on every request, and remembers nothing", async () => {
		const calls = setup();

		const first = await proxy(request(`/${SLUG}/companies`, [SESSION_COOKIE]));

		expect([...first.cookies.getAll()]).toHaveLength(0);
		expect(calls).toMatchObject({ workspace: 1, research: 0, auth: 1 });

		await proxy(request(`/${SLUG}/companies`, [SESSION_COOKIE]));

		expect(calls).toMatchObject({ workspace: 2, research: 0, auth: 2 });
	});

	it("notices when the answer changes underneath it", async () => {
		setup();
		expect(
			redirectedTo(
				await proxy(request(`/${SLUG}/companies`, [SESSION_COOKIE])),
			),
		).toBeNull();

		setup({ onboarded: false });
		expect(
			redirectedTo(
				await proxy(request(`/${SLUG}/companies`, [SESSION_COOKIE])),
			),
		).toBe("/onboarding");
	});

	it("takes a settled rep off both setup pages and into the workspace", async () => {
		setup();

		expect(
			redirectedTo(await proxy(request("/onboarding", [SESSION_COOKIE]))),
		).toBe(`/${SLUG}`);

		expect(
			redirectedTo(
				await proxy(request("/onboarding/research", [SESSION_COOKIE])),
			),
		).toBe(`/${SLUG}`);
	});

	it("never fights /grant-access, which would ping-pong forever", async () => {
		setup({ onboarded: false });

		expect(
			redirectedTo(await proxy(request("/grant-access", [SESSION_COOKIE]))),
		).toBeNull();
	});

	it("leaves the agent bridge alone", async () => {
		setup({ onboarded: false });

		expect(
			redirectedTo(await proxy(request("/eve/v1/info", [SESSION_COOKIE]))),
		).toBeNull();
	});

	it("preserves authenticated navigation when workspace metadata is unavailable", async () => {
		const calls = setup({ workspaceUnavailable: true });

		const response = await proxy(
			request(`/${SLUG}/companies`, [SESSION_COOKIE]),
		);

		expect(redirectedTo(response)).toBeNull();
		expect(calls.auth).toBe(1);
	});
});

describe("the slug the app is served under", () => {
	it("sends a signed-in rep off the landing page and into the workspace", async () => {
		setup();

		expect(redirectedTo(await proxy(request("/", [SESSION_COOKIE])))).toBe(
			`/${SLUG}`,
		);
	});

	it("puts the slug on a link that predates it, keeping the query", async () => {
		setup();

		const response = await proxy(
			request("/companies?record=contact:abc", [SESSION_COOKIE]),
		);

		expect(response.headers.get("location")).toBe(
			`http://localhost:3000/${SLUG}/companies?record=contact:abc`,
		);
	});

	it("moves a stale slug onto the current one, keeping the rest", async () => {
		setup();

		expect(
			redirectedTo(
				await proxy(request("/old-name/settings/members", [SESSION_COOKIE])),
			),
		).toBe(`/${SLUG}/settings/members`);
	});

	it("leaves a request that already carries the slug alone", async () => {
		setup();

		expect(
			redirectedTo(
				await proxy(request(`/${SLUG}/settings/sso`, [SESSION_COOKIE])),
			),
		).toBeNull();
	});

	it("rewrites nothing when the API could not say what the slug is", async () => {
		setup({ slug: "" });

		expect(
			redirectedTo(await proxy(request("/companies", [SESSION_COOKIE]))),
		).toBeNull();
	});
});

describe("optional research configuration", () => {
	it("keeps CRM available without a research key", async () => {
		const calls = setup({ configured: false });
		expect(
			redirectedTo(
				await proxy(request(`/${SLUG}/companies`, [SESSION_COOKIE])),
			),
		).toBeNull();
		expect(calls.research).toBe(0);
	});

	it("takes an onboarded rep off the old research setup page", async () => {
		setup({ configured: false });
		expect(
			redirectedTo(
				await proxy(request("/onboarding/research", [SESSION_COOKIE])),
			),
		).toBe(`/${SLUG}`);
	});

	it("still requires workspace setup before entering the CRM", async () => {
		setup({ onboarded: false, configured: false });
		expect(
			redirectedTo(
				await proxy(request(`/${SLUG}/companies`, [SESSION_COOKIE])),
			),
		).toBe("/onboarding");
	});

	it("enters the workspace once its name is saved", async () => {
		setup({ onboarded: true, configured: false });
		expect(
			redirectedTo(await proxy(request("/onboarding", [SESSION_COOKIE]))),
		).toBe(`/${SLUG}`);
	});
});

describe("Supabase identity enforcement", () => {
	it("ignores the default cookie from another local Supabase project", async () => {
		const calls = setup();
		const neighborCookie = SESSION_COOKIE.replace(
			COOKIE_NAME,
			"sb-127-auth-token",
		);
		const response = await proxy(
			request(`/${SLUG}/companies`, [neighborCookie]),
		);
		expect(redirectedTo(response)).toBe("/sign-in");
		expect(calls.auth).toBe(0);
		expect(calls.workspace).toBe(0);
	});

	it("rejects the former CRM session cookie", async () => {
		const calls = setup();
		expect(
			redirectedTo(
				await proxy(
					request(`/${SLUG}/companies`, ["crm.session_token=legacy-session"]),
				),
			),
		).toBe("/sign-in");
		expect(calls.workspace).toBe(0);
	});

	it("rejects a revoked session even when its cookie still looks valid", async () => {
		const calls = setup({ authStatus: 401 });
		const response = await proxy(
			request(`/${SLUG}/companies`, [SESSION_COOKIE]),
		);
		expect(redirectedTo(response)).toBe("/sign-in");
		expect(calls.auth).toBe(1);
		expect(calls.workspace).toBe(0);
		expect(response.headers.get("cache-control")).toContain("no-store");
	});

	it.each([
		["invalid session data", `${COOKIE_NAME}=base64-invalid`],
		["invalid UTF-8 around an access token", malformedUtf8Cookie()],
	])("rejects %s without reading workspace data", async (_, cookie) => {
		const calls = setup();
		const response = await proxy(
			request(`/${SLUG}/companies`, [
				cookie,
				"sb-127-auth-token=neighbor-cookie",
			]),
		);
		expect(redirectedTo(response)).toBe("/sign-in");
		expect(calls.workspace).toBe(0);
		expect(response.cookies.get(COOKIE_NAME)?.maxAge).toBe(0);
		expect(response.cookies.get("sb-127-auth-token")).toBeUndefined();
	});

	it.each([
		[
			"email identity",
			{
				...GOOGLE_USER,
				app_metadata: { provider: "email", providers: ["email"] },
				identities: GOOGLE_USER.identities.map((identity) => ({
					...identity,
					provider: "email",
				})),
			},
		],
		["unverified email", { ...GOOGLE_USER, email_confirmed_at: "" }],
		["anonymous user", { ...GOOGLE_USER, is_anonymous: true }],
		["unlisted email", { ...GOOGLE_USER, email: "outsider@another.example" }],
		["missing Google identity", { ...GOOGLE_USER, identities: [] }],
	])("rejects %s returned by Supabase", async (_, user) => {
		const calls = setup({ user });
		const response = await proxy(
			request(`/${SLUG}/companies`, [SESSION_COOKIE]),
		);
		expect(redirectedTo(response)).toBe("/sign-in");
		expect(calls.workspace).toBe(0);
		expect(response.cookies.get(COOKIE_NAME)?.maxAge).toBe(0);
	});

	it("rejects Google identities when the allowlist is empty", async () => {
		const calls = setup();
		process.env.ALLOWED_SIGN_IN = "";
		expect(
			redirectedTo(
				await proxy(request(`/${SLUG}/companies`, [SESSION_COOKIE])),
			),
		).toBe("/sign-in");
		expect(calls.workspace).toBe(0);
	});

	it("accepts a verified Google user from an explicitly allowed domain", async () => {
		const calls = setup();
		process.env.ALLOWED_SIGN_IN = "base-crm.example";
		expect(
			redirectedTo(
				await proxy(request(`/${SLUG}/companies`, [SESSION_COOKIE])),
			),
		).toBeNull();
		expect(calls.workspace).toBe(1);
	});
});

describe("Supabase SSR refresh", () => {
	it("forwards the renewed session to workspace reads, SSR and the browser", async () => {
		const calls = setup();
		const expiredCookie = sessionCookie(true);
		const response = await proxy(
			request(`/${SLUG}/companies`, [expiredCookie]),
		);
		const renewed = response.cookies.get(COOKIE_NAME);
		expect(redirectedTo(response)).toBeNull();
		expect(calls.refresh).toBe(1);
		expect(renewed?.value).toBeTruthy();
		expect(`${COOKIE_NAME}=${renewed?.value}`).not.toBe(expiredCookie);
		expect(calls.forwardedCookies[0]).toContain(
			`${COOKIE_NAME}=${renewed?.value}`,
		);
		expect(response.headers.get("x-middleware-request-cookie")).toContain(
			`${COOKIE_NAME}=${renewed?.value}`,
		);
		expect(response.headers.get("set-cookie")).toContain(
			`${COOKIE_NAME}=${renewed?.value}`,
		);
		expect(response.headers.get("cache-control")).toContain("no-store");
	});

	it("keeps the renewed cookie on redirects to the current workspace slug", async () => {
		const calls = setup();
		const response = await proxy(
			request("/old-workspace/companies?view=mine", [sessionCookie(true)]),
		);
		expect(response.headers.get("location")).toBe(
			`http://localhost:3000/${SLUG}/companies?view=mine`,
		);
		expect(calls.refresh).toBe(1);
		expect(response.cookies.get(COOKIE_NAME)?.value).toBeTruthy();
		expect(response.headers.get("set-cookie")).toContain(COOKIE_NAME);
		expect(response.headers.get("cache-control")).toContain("no-store");
	});

	it("keeps the renewed cookie on redirects to workspace onboarding", async () => {
		setup({ onboarded: false });
		const response = await proxy(
			request(`/${SLUG}/companies`, [sessionCookie(true)]),
		);
		expect(redirectedTo(response)).toBe("/onboarding");
		expect(response.cookies.get(COOKIE_NAME)?.value).toBeTruthy();
		expect(response.headers.get("cache-control")).toContain("no-store");
	});

	it("clears a revoked refresh token and refuses protected navigation", async () => {
		const calls = setup({ refreshStatus: 400 });
		const response = await proxy(
			request(`/${SLUG}/companies`, [sessionCookie(true)]),
		);
		expect(redirectedTo(response)).toBe("/sign-in");
		expect(calls.refresh).toBe(1);
		expect(calls.workspace).toBe(0);
		expect(response.cookies.get(COOKIE_NAME)?.maxAge).toBe(0);
	});
});
