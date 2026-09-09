import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	spyOn,
} from "bun:test";
import { db } from "@crm/db";
import { getSession } from "../src/auth";
import { WORKSPACE_ID } from "../src/organization";

const localUserId = crypto.randomUUID();
const googleUserId = crypto.randomUUID();
const seedId = `local-email-seed-${crypto.randomUUID()}`;
const originalFlag = process.env.LOCAL_EMAIL_LOGIN_ENABLED;
const originalUrl = process.env.SUPABASE_URL;
const originalAllowlist = process.env.ALLOWED_SIGN_IN;
const token = `fixture.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, session_id: crypto.randomUUID() })).toString("base64url")}.fixture`;
const headers = new Headers({ authorization: `Bearer ${token}` });
let fetchSpy: ReturnType<typeof spyOn> | undefined;

beforeAll(async () => {
	if (await db.member.count({ where: { organizationId: WORKSPACE_ID } }))
		throw new Error(
			"Local email ownership tests require an empty isolated test workspace.",
		);
	process.env.LOCAL_EMAIL_LOGIN_ENABLED = "true";
	process.env.SUPABASE_URL = "http://127.0.0.1:57321";
	process.env.ALLOWED_SIGN_IN = "example.test";
	await db.user.create({
		data: {
			id: seedId,
			email: `${seedId}@example.test`,
			name: "Mock profile",
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
	if (originalFlag === undefined) delete process.env.LOCAL_EMAIL_LOGIN_ENABLED;
	else process.env.LOCAL_EMAIL_LOGIN_ENABLED = originalFlag;
	if (originalUrl === undefined) delete process.env.SUPABASE_URL;
	else process.env.SUPABASE_URL = originalUrl;
	if (originalAllowlist === undefined) delete process.env.ALLOWED_SIGN_IN;
	else process.env.ALLOWED_SIGN_IN = originalAllowlist;
	await db.user.deleteMany({
		where: { id: { in: [localUserId, googleUserId, seedId] } },
	});
});
function validatedIdentity(provider: "email" | "google", id: string) {
	const user = {
		id,
		email: `${id}@example.test`,
		email_confirmed_at: new Date().toISOString(),
		app_metadata: { provider },
		user_metadata: { full_name: "Temporary local test user" },
		identities: [{ id: `identity-${id}`, provider }],
	};
	const responder = Object.assign(
		async () =>
			new Response(JSON.stringify(user), {
				headers: { "content-type": "application/json" },
			}),
		{ preconnect: globalThis.fetch.preconnect },
	);
	fetchSpy = spyOn(globalThis, "fetch").mockImplementation(responder);
}
async function roleOf(userId: string) {
	return (
		await db.member.findUnique({
			where: {
				organizationId_userId: { organizationId: WORKSPACE_ID, userId },
			},
		})
	)?.role;
}
describe("local email profile and ownership", () => {
	it("records an email identity without inventing a Google account and owns the workspace", async () => {
		validatedIdentity("email", localUserId);
		expect((await getSession({ headers }))?.user.id).toBe(localUserId);
		const accounts = await db.account.findMany({
			where: { userId: localUserId },
			select: { id: true, providerId: true, accountId: true, scope: true },
		});
		expect(accounts).toEqual([
			{
				id: `supabase-email:${localUserId}`,
				providerId: "email",
				accountId: `identity-${localUserId}`,
				scope: null,
			},
		]);
		expect(await roleOf(localUserId)).toBe("owner");
		expect(await db.member.count({ where: { userId: seedId } })).toBe(0);
	});
	it("preserves the email owner when another Google user signs in", async () => {
		validatedIdentity("google", googleUserId);
		expect((await getSession({ headers }))?.user.id).toBe(googleUserId);
		expect(await roleOf(localUserId)).toBe("owner");
		expect(await roleOf(googleUserId)).toBe("member");
	});
	it("preserves the email owner on repeat login and denies the session after opt-in is disabled", async () => {
		validatedIdentity("email", localUserId);
		expect((await getSession({ headers }))?.user.id).toBe(localUserId);
		expect(await roleOf(localUserId)).toBe("owner");
		process.env.LOCAL_EMAIL_LOGIN_ENABLED = "false";
		expect(await getSession({ headers })).toBeNull();
	});
});
