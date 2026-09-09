import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	spyOn,
} from "bun:test";
import { auth, WORKSPACE_ID } from "@crm/auth";
import { db } from "@crm/db";
import { ForbiddenException } from "@nestjs/common";
import { ApiKeysService } from "../src/api-keys/api-keys.service";

const suffix = crypto.randomUUID();
const userId = crypto.randomUUID();
const otherId = crypto.randomUUID();
const mockId = `mock-${suffix}`;
const originalAllowlist = process.env.ALLOWED_SIGN_IN;
const user = {
	id: userId,
	email: `google-${suffix}@example.test`,
	email_confirmed_at: new Date().toISOString(),
	app_metadata: { provider: "google" },
	user_metadata: { full_name: "Google Test User" },
	identities: [{ id: `google-${suffix}`, provider: "google" }],
};
const token = `fixture.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, session_id: suffix })).toString("base64url")}.fixture`;
const headers = new Headers({ authorization: `Bearer ${token}` });
let fetchSpy: ReturnType<typeof spyOn> | undefined;

beforeAll(async () => {
	process.env.ALLOWED_SIGN_IN = "example.test";
	const members = await db.member.count({
		where: { organizationId: WORKSPACE_ID },
	});
	if (members)
		throw new Error(
			"Use an empty isolated test database for auth bootstrap tests.",
		);
	await db.user.create({
		data: {
			id: mockId,
			email: `mock-${suffix}@example.test`,
			name: "Earlier Mock",
			emailVerified: false,
			createdAt: new Date(0),
		},
	});
});
afterEach(() => {
	fetchSpy?.mockRestore();
	fetchSpy = undefined;
});
afterAll(async () => {
	process.env.ALLOWED_SIGN_IN = originalAllowlist;
	await db.user.deleteMany({
		where: { id: { in: [userId, otherId, mockId] } },
	});
});
function validatedGoogle() {
	const responder = Object.assign(
		async () =>
			new Response(JSON.stringify(user), {
				headers: { "content-type": "application/json" },
			}),
		{ preconnect: globalThis.fetch.preconnect },
	);
	fetchSpy = spyOn(globalThis, "fetch").mockImplementation(responder);
}

describe("Supabase profile and API-key integration", () => {
	it("upserts the real Google UUID and grants the first human ownership despite mock data", async () => {
		validatedGoogle();
		const first = await auth.api.getSession({ headers });
		expect(first?.user.id).toBe(userId);
		expect(first?.user.name).toBe("Google Test User");
		expect(first?.session.activeOrganizationId).toBe(WORKSPACE_ID);
		expect(await auth.api.getSession({ headers })).not.toBeNull();
		expect(await db.user.count({ where: { id: userId } })).toBe(1);
		expect(
			await db.account.count({ where: { userId, providerId: "google" } }),
		).toBe(1);
		expect(
			(
				await db.member.findUnique({
					where: {
						organizationId_userId: { organizationId: WORKSPACE_ID, userId },
					},
				})
			)?.role,
		).toBe("owner");
		expect(await db.member.count({ where: { userId: mockId } })).toBe(0);
	});
	it("validates access tokens from Supabase SSR cookies without refreshing", async () => {
		validatedGoogle();
		const cookieName = "sb-base-crm-auth-token";
		const cookie = `base64-${Buffer.from(JSON.stringify({ access_token: token, refresh_token: "never-used" })).toString("base64url")}`;
		expect(
			(
				await auth.api.getSession({
					headers: new Headers({ cookie: `${cookieName}=${cookie}` }),
				})
			)?.user.id,
		).toBe(userId);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(String(fetchSpy?.mock.calls[0]?.[0])).toContain("/auth/v1/user");
	});
	it("rejects legacy API keys and prevents creating new ones", async () => {
		const keys = new ApiKeysService();
		const key = "crm_legacy-test-key";
		await db.apikey.create({
			data: {
				id: `key-${suffix}`,
				referenceId: userId,
				key,
				name: "Legacy key",
				enabled: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});
		expect(
			await auth.api.getSession({ headers: new Headers({ "x-api-key": key }) }),
		).toBeNull();
		await expect(
			keys.create(userId, headers, { name: "Automation", expiresInDays: 7 }),
		).rejects.toBeInstanceOf(ForbiddenException);
		await expect(
			keys.revoke(userId, headers, { id: `key-${suffix}` }),
		).rejects.toBeInstanceOf(ForbiddenException);
	});
});
