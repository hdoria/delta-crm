import { hasSignInAllowList, isWorkspaceEmail } from "./workspace";

export type SupabaseIdentity = {
	id: string;
	email?: string;
	email_confirmed_at?: string;
	is_anonymous?: boolean;
	app_metadata: { provider?: string };
	identities?: { provider: string }[];
};

export function allowsSupabaseUser(user: SupabaseIdentity): boolean {
	return Boolean(
		!user.is_anonymous &&
			user.email_confirmed_at &&
			user.app_metadata.provider === "google" &&
			user.identities?.some((identity) => identity.provider === "google") &&
			hasSignInAllowList() &&
			isWorkspaceEmail(user.email),
	);
}
