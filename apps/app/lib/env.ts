export const API_URL =
	process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function isMarketing(): boolean {
	return process.env.IS_MARKETING === "true";
}

export const AUTH_SETTINGS_TIMEOUT_MS = 3_000;
