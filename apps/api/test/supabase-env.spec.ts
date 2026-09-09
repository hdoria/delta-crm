import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { validateEnv } from "../src/config/env.validation";

describe("Supabase preparation before Google setup", () => {
	it("starts without Google credentials or an allowlist", () => {
		const env = validateEnv({
			NODE_ENV: "test",
			DATABASE_URL:
				"postgresql://postgres:postgres@127.0.0.1:57322/base_crm_test",
			SUPABASE_URL: "http://127.0.0.1:57321",
			SUPABASE_ANON_KEY: "test-publishable-key",
			ALLOWED_SIGN_IN: "",
		});
		expect(env.ALLOWED_SIGN_IN).toBe("");
		expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
	});
});
