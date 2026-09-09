import { describe, expect, it } from "bun:test";
import { isGoogleConfigured } from "@crm/auth";
import { ForbiddenException } from "@nestjs/common";
import { SsoService } from "../src/sso/sso.service";

describe("Google-only login", () => {
	const sso = new SsoService();
	it("never offers Microsoft or enterprise SSO", async () => {
		expect(await sso.signInOptions()).toEqual({
			google: isGoogleConfigured(),
			microsoft: false,
			providers: [],
		});
	});
	it("does not expose inactive provider configuration", async () => {
		expect((await sso.settings("owner")).canConfigure).toBe(false);
		expect(
			await sso.list({
				q: "",
				sort: "providerId",
				dir: "asc",
				page: 1,
				pageSize: 25,
			}),
		).toEqual({ rows: [], total: 0, facetCounts: {} });
	});
	it("rejects SSO writes even for an owner", async () => {
		await expect(
			sso.register("owner", new Headers(), {
				providerId: "okta",
				issuer: "https://example.com",
				domain: "example.com",
				clientId: "test",
				clientSecret: "test",
			}),
		).rejects.toBeInstanceOf(ForbiddenException);
		await expect(
			sso.remove("owner", new Headers(), { providerId: "okta" }),
		).rejects.toBeInstanceOf(ForbiddenException);
	});
});
