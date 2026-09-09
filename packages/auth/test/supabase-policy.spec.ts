import { afterEach, describe, expect, it } from "bun:test";
import { allowsSupabaseUser } from "../src/policy";

const previous = process.env.ALLOWED_SIGN_IN;
afterEach(() => {
	process.env.ALLOWED_SIGN_IN = previous;
});
const google = {
	id: "e46ebfce-c60c-48d0-8c2a-07a441e5902b",
	email: "hugo@example.com",
	email_confirmed_at: "2026-09-09T00:00:00Z",
	app_metadata: { provider: "google" },
	identities: [{ provider: "google" }],
};
describe("Google-only Supabase access policy", () => {
	it("accepts verified Google identities on the allowlist", () => {
		process.env.ALLOWED_SIGN_IN = "example.com";
		expect(allowsSupabaseUser(google)).toBe(true);
	});
	it("fails closed without an allowlist or an allowed email", () => {
		process.env.ALLOWED_SIGN_IN = "";
		expect(allowsSupabaseUser(google)).toBe(false);
		process.env.ALLOWED_SIGN_IN = "someone@example.com";
		expect(allowsSupabaseUser(google)).toBe(false);
	});
	it("rejects unverified, anonymous, forged metadata and non-Google users", () => {
		process.env.ALLOWED_SIGN_IN = "example.com";
		expect(
			allowsSupabaseUser({ ...google, email_confirmed_at: undefined }),
		).toBe(false);
		expect(allowsSupabaseUser({ ...google, is_anonymous: true })).toBe(false);
		expect(
			allowsSupabaseUser({ ...google, app_metadata: { provider: "email" } }),
		).toBe(false);
		expect(
			allowsSupabaseUser({ ...google, identities: [{ provider: "azure" }] }),
		).toBe(false);
		expect(
			allowsSupabaseUser({
				...google,
				app_metadata: {},
				user_metadata: { provider: "google" },
			}),
		).toBe(false);
	});
	it("does not match lookalike email domains", () => {
		process.env.ALLOWED_SIGN_IN = "example.com";
		expect(
			allowsSupabaseUser({ ...google, email: "hugo@notexample.com" }),
		).toBe(false);
	});
});
