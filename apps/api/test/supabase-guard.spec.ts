import "reflect-metadata";
import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { auth, type Session } from "@crm/auth";
import { type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_MODE } from "../src/auth/auth.decorators";
import { SupabaseAuthGuard } from "../src/auth/supabase-auth.guard";

const reflector = new Reflector();
const guard = new SupabaseAuthGuard(reflector);
const spies: { mockRestore(): void }[] = [];
afterEach(() => {
	for (const spy of spies.splice(0)) spy.mockRestore();
});
type GuardRequest = {
	headers: Record<string, string>;
	session?: Session | null;
};
function context(mode?: string) {
	const handler = () => {};
	if (mode) Reflect.defineMetadata(AUTH_MODE, mode, handler);
	const req: GuardRequest = {
		headers: {},
	};
	const ctx = {
		getHandler: () => handler,
		getClass: () => class TestController {},
		switchToHttp: () => ({ getRequest: () => req }),
	} as unknown as ExecutionContext;
	return { ctx, req };
}
describe("Supabase REST guard", () => {
	it("rejects anonymous calls to protected handlers", async () => {
		spies.push(spyOn(auth.api, "getSession").mockResolvedValue(null));
		await expect(guard.canActivate(context().ctx)).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});
	it("keeps optional and explicitly public handlers accessible", async () => {
		const spy = spyOn(auth.api, "getSession").mockResolvedValue(null);
		spies.push(spy);
		expect(await guard.canActivate(context("public").ctx)).toBe(true);
		expect(spy).not.toHaveBeenCalled();
		const optional = context("optional");
		expect(await guard.canActivate(optional.ctx)).toBe(true);
		expect(optional.req.session).toBeNull();
	});
	it("attaches only the validated session for protected handlers", async () => {
		const session = {
			user: {
				id: "google-user",
				email: "u@example.com",
				name: "User",
				emailVerified: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			session: {
				id: "s",
				userId: "google-user",
				expiresAt: new Date(Date.now() + 1000),
				activeOrganizationId: "workspace",
			},
		};
		spies.push(spyOn(auth.api, "getSession").mockResolvedValue(session));
		const authenticated = context();
		expect(await guard.canActivate(authenticated.ctx)).toBe(true);
		expect(authenticated.req.session).toEqual(session);
	});
});
