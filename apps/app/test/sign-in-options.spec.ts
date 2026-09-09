import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { readSignInOptions } from "../app/(landing)/sign-in/sign-in-options";

const savedEnv = Object.fromEntries(
	[
		"SUPABASE_URL",
		"SUPABASE_ANON_KEY",
		"ALLOWED_SIGN_IN",
		"LOCAL_EMAIL_LOGIN_ENABLED",
	].map((name) => [name, process.env[name]]),
);
const originalFetch = globalThis.fetch;

beforeEach(() => {
	process.env.SUPABASE_URL = "http://127.0.0.1:57321";
	process.env.SUPABASE_ANON_KEY = "public-key-for-http-stub";
	process.env.ALLOWED_SIGN_IN = "teacher@base-crm.example";
	process.env.LOCAL_EMAIL_LOGIN_ENABLED = "true";
	settings({ google: true, email: true });
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	for (const [name, value] of Object.entries(savedEnv)) {
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	}
});

function settings(external: { google: boolean; email: boolean }, status = 200) {
	globalThis.fetch = (async () =>
		Response.json({ external }, { status })) as unknown as typeof fetch;
}

describe("available sign-in methods", () => {
	it("offers local email login while Google is still unconfigured", async () => {
		settings({ google: false, email: true });
		expect(await readSignInOptions()).toEqual({ google: false, email: true });
	});

	it("keeps Google available beside the temporary local form", async () => {
		expect(await readSignInOptions()).toEqual({ google: true, email: true });
	});

	it("hides email login when Supabase disables its email provider", async () => {
		settings({ google: true, email: false });
		expect(await readSignInOptions()).toEqual({ google: true, email: false });
	});

	it("hides email login when the local feature is disabled", async () => {
		process.env.LOCAL_EMAIL_LOGIN_ENABLED = "false";
		expect(await readSignInOptions()).toEqual({ google: true, email: false });
	});

	it("keeps email login off for a cloud project even when the flag stays enabled", async () => {
		process.env.SUPABASE_URL = "https://base-crm-tests.supabase.co";
		expect(await readSignInOptions()).toEqual({ google: true, email: false });
	});

	it("offers no access when the allowlist is empty", async () => {
		process.env.ALLOWED_SIGN_IN = "";
		expect(await readSignInOptions()).toEqual({ google: false, email: false });
	});

	it("does not offer a provider whose configuration cannot be verified", async () => {
		settings({ google: true, email: true }, 503);
		expect(await readSignInOptions()).toEqual({ google: false, email: false });
	});

	it("handles unavailable settings without exposing service errors", async () => {
		globalThis.fetch = (async () => {
			throw new Error("Auth settings unavailable");
		}) as unknown as typeof fetch;
		expect(await readSignInOptions()).toEqual({ google: false, email: false });
	});
});
