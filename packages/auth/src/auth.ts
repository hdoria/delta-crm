import { createHash } from "node:crypto";
import { db } from "@crm/db";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { API_KEY_HEADER } from "./api-keys";
import { accessTokenFromCookies } from "./cookies";
import { ensureWorkspaceMembership } from "./organization";
import { allowsSupabaseUser } from "./policy";
import { createTokenSupabaseClient } from "./supabase";

export type SessionUser = {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
	image?: string | null;
	createdAt: Date;
	updatedAt: Date;
};
export type Session = {
	user: SessionUser;
	session: {
		id: string;
		userId: string;
		expiresAt: Date;
		activeOrganizationId: string | null;
	};
};

const identityProfile = z.object({
	full_name: z.string().catch("").optional(),
	avatar_url: z.string().nullable().catch(null).optional(),
});
const sessionClaims = z.object({
	exp: z.number().finite(),
	session_id: z.string().optional(),
});

async function profileFor(user: User): Promise<SessionUser> {
	const providerId = z
		.enum(["google", "email"])
		.parse(user.app_metadata.provider);
	const identity = user.identities?.find(
		(candidate) => candidate.provider === providerId,
	);
	const metadata = identityProfile.parse(user.user_metadata);
	const email = user.email;
	if (!email) throw new Error("A verified email is required.");
	const profile = await db.user.upsert({
		where: { id: user.id },
		create: {
			id: user.id,
			email: email,
			emailVerified: true,
			name: metadata.full_name || email,
			image: metadata.avatar_url ?? null,
		},
		update: { email: email, emailVerified: true },
	});
	await db.account.upsert({
		where: { id: `supabase-${providerId}:${user.id}` },
		create: {
			id: `supabase-${providerId}:${user.id}`,
			userId: user.id,
			providerId,
			accountId: identity?.id ?? user.id,
			scope: providerId === "google" ? "openid email profile" : null,
		},
		update: { accountId: identity?.id ?? user.id },
	});
	return profile;
}

export async function getSession({
	headers,
}: {
	headers: Headers;
}): Promise<Session | null> {
	try {
		const key = headers.get(API_KEY_HEADER);
		if (key !== null) return null;
		const authorization = headers.get("authorization");
		const bearer = authorization?.match(/^Bearer (\S+)$/i)?.[1];
		if (!bearer && !headers.get("cookie")?.includes("sb-")) return null;
		const token = bearer ?? accessTokenFromCookies(headers.get("cookie") ?? "");
		if (!token) return null;
		const client = createTokenSupabaseClient();
		const {
			data: { user },
			error,
		} = await client.auth.getUser(token);
		if (error || !user || !allowsSupabaseUser(user)) return null;
		const claims = sessionClaims.parse(
			JSON.parse(
				Buffer.from(token.split(".")[1] ?? "", "base64url").toString(),
			),
		);
		if (claims.exp * 1000 <= Date.now()) return null;
		const profile = await profileFor(user);
		const activeOrganizationId = await ensureWorkspaceMembership(user.id);
		if (!activeOrganizationId) return null;
		return {
			user: profile,
			session: {
				id:
					claims.session_id ?? createHash("sha256").update(token).digest("hex"),
				userId: user.id,
				expiresAt: new Date(claims.exp * 1000),
				activeOrganizationId,
			},
		};
	} catch {
		return null;
	}
}

export const auth = { api: { getSession } };
export type Auth = typeof auth;
