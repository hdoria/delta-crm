import { hasSignInAllowList, isWorkspaceEmail } from "./workspace";

export type SupabaseIdentity = {
	id: string;
	email?: string;
	email_confirmed_at?: string;
	is_anonymous?: boolean;
	app_metadata: { provider?: string };
	identities?: { provider: string }[];
};

export function isLocalEmailLoginEnabled(): boolean {
	if (process.env.LOCAL_EMAIL_LOGIN_ENABLED !== "true") return false;
	try {
		const url = new URL(process.env.SUPABASE_URL ?? "");
		return (
			["http:", "https:"].includes(url.protocol) &&
			["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
		);
	} catch {
		return false;
	}
}

export function allowsSupabaseUser(user: SupabaseIdentity): boolean {
	const provider = user.app_metadata.provider;
	const allowedProvider =
		provider === "google" ||
		(provider === "email" && isLocalEmailLoginEnabled());
	return Boolean(
		!user.is_anonymous &&
			user.email_confirmed_at &&
			allowedProvider &&
			user.identities?.some((identity) => identity.provider === provider) &&
			hasSignInAllowList() &&
			isWorkspaceEmail(user.email),
	);
}
