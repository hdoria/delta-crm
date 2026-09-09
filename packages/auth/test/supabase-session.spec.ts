import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { getSession } from "../src/auth";

const previous = {
	allowlist: process.env.ALLOWED_SIGN_IN,
	url: process.env.SUPABASE_URL,
	key: process.env.SUPABASE_ANON_KEY,
};
let fetchSpy: ReturnType<typeof spyOn> | undefined;
afterEach(() => {
	fetchSpy?.mockRestore();
	fetchSpy = undefined;
	process.env.ALLOWED_SIGN_IN = previous.allowlist;
	process.env.SUPABASE_URL = previous.url;
	process.env.SUPABASE_ANON_KEY = previous.key;
});
type AuthResponse =
	| { message: string; code?: string }
	| {
			id: string;
			email: string;
			email_confirmed_at: string;
			app_metadata: { provider: string };
			user_metadata: Record<string, string>;
			identities: { provider: string }[];
	  };
function remoteUser(payload: AuthResponse, status = 200) {
	process.env.SUPABASE_URL = "http://127.0.0.1:54321";
	process.env.SUPABASE_ANON_KEY = "unit-test-publishable-key";
	process.env.ALLOWED_SIGN_IN = "example.com";
	fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
		new Response(JSON.stringify(payload), {
			status,
			headers: { "content-type": "application/json" },
		}),
	);
}
const bearer = () =>
	new Headers({ authorization: "Bearer forged-or-revoked-token" });
describe("Supabase server session boundary", () => {
	it("ignores legacy, fabricated and missing session cookies", async () => {
		for (const cookie of [
			"",
			"crm.session_token=old-credential",
			"crm.session_data=forged",
			"base-crm-demo=1",
		]) {
			expect(await getSession({ headers: new Headers({ cookie }) })).toBeNull();
		}
	});
	it("rejects revoked or expired bearer tokens using the Auth server", async () => {
		remoteUser({ message: "JWT expired", code: "bad_jwt" }, 401);
		expect(await getSession({ headers: bearer() })).toBeNull();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
	it("rejects a valid Auth user from a non-Google provider", async () => {
		remoteUser({
			id: "not-google",
			email: "hugo@example.com",
			email_confirmed_at: new Date().toISOString(),
			app_metadata: { provider: "azure" },
			user_metadata: {},
			identities: [{ provider: "azure" }],
		});
		expect(await getSession({ headers: bearer() })).toBeNull();
	});
	it("rejects Google users outside the allowlist before writing a CRM profile", async () => {
		remoteUser({
			id: "outside",
			email: "user@outside.com",
			email_confirmed_at: new Date().toISOString(),
			app_metadata: { provider: "google" },
			user_metadata: {},
			identities: [{ provider: "google" }],
		});
		expect(await getSession({ headers: bearer() })).toBeNull();
	});
	it("fails closed if Supabase cannot validate the token", async () => {
		remoteUser({ message: "Auth unavailable" }, 503);
		expect(await getSession({ headers: bearer() })).toBeNull();
	});
});
