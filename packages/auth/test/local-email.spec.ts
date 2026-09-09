import { afterEach, describe, expect, it } from "bun:test";
import { allowsSupabaseUser, isLocalEmailLoginEnabled } from "../src/policy";

const original = {
	flag: process.env.LOCAL_EMAIL_LOGIN_ENABLED,
	url: process.env.SUPABASE_URL,
	allowlist: process.env.ALLOWED_SIGN_IN,
};
afterEach(() => {
	if (original.flag === undefined) delete process.env.LOCAL_EMAIL_LOGIN_ENABLED;
	else process.env.LOCAL_EMAIL_LOGIN_ENABLED = original.flag;
	if (original.url === undefined) delete process.env.SUPABASE_URL;
	else process.env.SUPABASE_URL = original.url;
	if (original.allowlist === undefined) delete process.env.ALLOWED_SIGN_IN;
	else process.env.ALLOWED_SIGN_IN = original.allowlist;
});
const emailUser = {
	id: "local-email-fixture",
	email: "test-user@example.test",
	email_confirmed_at: "2026-09-09T00:00:00Z",
	app_metadata: { provider: "email" },
	identities: [{ provider: "email" }],
};
function enableLocalEmail() {
	process.env.LOCAL_EMAIL_LOGIN_ENABLED = "true";
	process.env.SUPABASE_URL = "http://127.0.0.1:57321";
	process.env.ALLOWED_SIGN_IN = "example.test";
}
describe("temporary local email sign-in", () => {
	it("admits confirmed allowlisted email identities only when explicitly enabled locally", () => {
		enableLocalEmail();
		for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
			process.env.SUPABASE_URL = `http://${host}:57321`;
			expect(isLocalEmailLoginEnabled()).toBe(true);
			expect(allowsSupabaseUser(emailUser)).toBe(true);
		}
	});
	it("fails closed when the flag is missing, false or not the exact true value", () => {
		enableLocalEmail();
		for (const flag of ["", "false", "TRUE", "1"]) {
			process.env.LOCAL_EMAIL_LOGIN_ENABLED = flag;
			expect(isLocalEmailLoginEnabled()).toBe(false);
			expect(allowsSupabaseUser(emailUser)).toBe(false);
		}
		delete process.env.LOCAL_EMAIL_LOGIN_ENABLED;
		expect(allowsSupabaseUser(emailUser)).toBe(false);
	});
	it("never enables email sign-in against a remote or malformed Supabase URL", () => {
		enableLocalEmail();
		for (const url of [
			"https://project.supabase.co",
			"http://localhost.example.com",
			"http://192.168.1.10:54321",
			"ftp://127.0.0.1",
			"not-a-url",
			"",
		]) {
			process.env.SUPABASE_URL = url;
			expect(isLocalEmailLoginEnabled()).toBe(false);
			expect(allowsSupabaseUser(emailUser)).toBe(false);
		}
	});
	it("still rejects unconfirmed, anonymous, missing-identity and disallowed users", () => {
		enableLocalEmail();
		expect(
			allowsSupabaseUser({ ...emailUser, email_confirmed_at: undefined }),
		).toBe(false);
		expect(allowsSupabaseUser({ ...emailUser, is_anonymous: true })).toBe(
			false,
		);
		expect(allowsSupabaseUser({ ...emailUser, identities: [] })).toBe(false);
		expect(
			allowsSupabaseUser({ ...emailUser, app_metadata: { provider: "azure" } }),
		).toBe(false);
		expect(
			allowsSupabaseUser({ ...emailUser, email: "not-allowed@outside.test" }),
		).toBe(false);
		process.env.ALLOWED_SIGN_IN = "";
		expect(allowsSupabaseUser(emailUser)).toBe(false);
	});
});
